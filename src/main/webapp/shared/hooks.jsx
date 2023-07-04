import { splunkdPath, username } from "@splunk/splunk-utils/config";
import { defaultFetchInit } from "@splunk/splunk-utils/fetch";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useReducer, useState } from "react";
import { MAP_BLACKLIST } from "./const";
import { makeBody, request } from "./fetch";
import { dedup, localLoad } from "./helpers";
export const LOCAL_URL = `${splunkdPath}/servicesNS/${username}/badmsc`;

export const handle = (res) =>
    res.ok
        ? res.json()
        : res.text().then((text) => {
              console.error(text);
              return Promise.reject(res.status);
          });

export const nameContent = (data) => Object.fromEntries(data.entry.map(({ name, content }) => [name, content]));
export const keyContent = (data) => data.entry.map(({ name }) => name);
export const entryNames = (data) => data.entry.map(({ name }) => name);
const entry = (data) => data.entry;

export const makeQuery = (target, path, postprocess = entry) => ({
    queryKey: [target.key, path],
    queryFn: ({ signal }) =>
        request(
            {
                url: `${target.api}/${path}`,
                method: "GET",
                params: { output_mode: "json", count: -1 },
                headers: {
                    Authorization: `Bearer ${target.token}`,
                },
            },
            signal
        )
            .then(handle)
            .then(postprocess, (e) => (e == 404 ? [] : Promise.reject(e))),
    enabled: !!target,
});

export const handleAcl = (config, url, src, queryClient) => async (dst_data) => {
    if (dst_data.entry.length !== 1) {
        console.warn("This isnt a single entry, aborting ACL fix");
        return dst_data;
    }
    const dst = dst_data.entry[0].acl;

    if (src.sharing == "user" && dst.sharing == "user") {
        return dst_data;
    }

    /*const [dst_users, dst_roles] = await Promise.all([
        queryClient.fetchQuery(makeQuery(config.dst, "services/authentication/users", nameContent)).then(Object.keys),
        queryClient.fetchQuery(makeQuery(config.dst, "services/authorization/roles", nameContent)).then(Object.keys),
    ]);

    dst_users.push("nobody");
    dst_roles.push("*");

    if (src.owner == "admin") src.owner = "sc_admin";*/

    const { users, roles } = await queryClient.fetchQuery(queryMaps);

    const data = [
        ["sharing", src.sharing],
        ["owner", users[src.owner] ?? src.owner],
    ];

    // Private KOs have no perms
    Object.keys(src.perms || {}).forEach((perm) => data.push([`perms.${perm}`, dedup(src.perms[perm].map((x) => roles[x] ?? x)).join(",")]));

    console.log(users, roles, data);

    return request({
        url: `${url}/acl`,
        method: "POST",
        params: { output_mode: "json" },
        headers: {
            Authorization: `Bearer ${config.dst.token}`,
        },
        data,
    })
        .then(handle)
        .then(
            (newacls) => {
                dst_data.entry[0].acl = newacls.entry[0].acl;
                return dst_data;
            },
            (e) => {
                console.error(`ACLs for ${url} could not be corrected, ${e}`);
                return dst_data;
            }
        );
};

export const useConfig = () =>
    useQuery({
        queryKey: ["config"],
        queryFn: ({ signal }) =>
            fetch(`${LOCAL_URL}/storage/passwords/badmsc%3Aauth%3A?output_mode=json&count=1`, { ...defaultFetchInit, signal }).then((res) => {
                if (res.status === 404) {
                    return false;
                }
                if (res.status === 200) {
                    return res
                        .json()
                        .then((data) => JSON.parse(data.entry[0].content.clear_password))
                        .then((config) => {
                            config.src.key = "src";
                            config.dst.key = "dst";
                            return config;
                        })
                        .catch(() => Promise.reject());
                }
                return Promise.reject();
            }),

        notifyOnChangeProps: ["data"],
    }).data;

export const useApi = (target, path, postprocess) => useQuery(makeQuery(target, path, postprocess));

export const useApps = (target) =>
    // useApps is called in multiple steps, so is defined once for consistency
    useApi(target, "services/apps/local", (data) => Object.fromEntries(data.entry.map((app) => [app.name, app])));

export const useAcs = (target, endpoint, postprocess = (x) => x) =>
    useQuery({
        queryKey: ["acs", endpoint],
        queryFn: ({ signal }) =>
            request(
                {
                    url: `${target.acs}/adminconfig/v2/${endpoint}`,
                    method: "GET",
                    params: { count: 0 },
                    headers: {
                        Authorization: `Bearer ${target.token}`,
                    },
                },
                signal
            )
                .then(handle)
                .then(postprocess),
        enabled: !!target,
    });

export const processConfs = (data) =>
    data.entry.reduce((x, { name, acl, content }) => {
        // Figure out how to decode URI values here
        let app = acl.app;
        x[app] ??= {};
        x[app][name] = {
            sharing: acl.sharing,
            perms: acl.perms,
            owner: acl.owner,
            content,
        };
        return x;
    }, {});

export const useConfs = (target, files, user = "nobody") =>
    useQueries({
        queries: files.map((file) => makeQuery(target, `servicesNS/${encodeURIComponent(user)}/-/configs/conf-${file}`, processConfs)),
    });

const handleDefaults = (data) => Object.fromEntries(data.entry.map(({ name, content }) => [name, content]));

export const useDefaults = (target, files) =>
    useQueries({
        queries: files.map((file) => makeQuery(target, `services/properties/${file}/default`, handleDefaults)),
    });

export const useLocal = (key, fallback) => {
    return useReducer((prev, value) => {
        value === null ? window.localStorage.removeItem(key) : window.localStorage.setItem(key, JSON.stringify(value));
        return value;
    }, localLoad(key, fallback));
};

export const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
};

export const useLock = () => {
    const [lock, setLock] = useState(Promise.resolve());
    return async () => {
        await lock;
        let unlock = () => {};
        setLock(lock.then((resolve) => (unlock = resolve)));
        return unlock;
    };
};

export const queryMaps = {
    queryKey: ["maps"],
    queryFn: ({ signal }) =>
        fetch(`${splunkdPath}/servicesNS/nobody/badmsc/configs/conf-msc?output_mode=json&summarize=true`, { ...defaultFetchInit, signal })
            .then(handle)
            .then((data) =>
                Object.fromEntries(
                    data.entry.map(({ name, content }) => [name, Object.fromEntries(Object.entries(content).filter(([k, v]) => !MAP_BLACKLIST.includes(k)))])
                )
            ),
    placeholderData: { roles: false, users: false },
    notifyOnChangeProps: ["data"],
};
export const useMaps = () => useQuery(queryMaps).data;
