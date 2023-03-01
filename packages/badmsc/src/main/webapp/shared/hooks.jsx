import React from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { splunkdPath } from '@splunk/splunk-utils/config';
import { defaultFetchInit } from '@splunk/splunk-utils/fetch';
import { makeBody } from './fetch';
import { CONF_FILES } from './const';

export const handle = (res) => (res.ok ? res.json() : Promise.reject(res.json()));
const entry = (data) => data.entry;

export const useConfigs = (to, files = CONF_FILES) =>
    useQueries({
        queries: files.map((file) => ({
            queryKey: [to, 'config', file],
            queryFn: () =>
                fetch(
                    `${splunkdPath}/services/badmsc/proxy?${new URLSearchParams({
                        to,
                        uri: `servicesNS/nobody/-/configs/conf-${file}`,
                        count: '0',
                        output_mode: 'json',
                    })}`,
                    defaultFetchInit
                )
                    .then(handle)
                    .then((data) =>
                        data.entry.reduce(
                            (x, { name, acl, content }) => {
                                x[acl.sharing][acl.app] ||= {};
                                x[acl.sharing][acl.app][name] = { perms: acl.perms, content };
                                return x;
                            },
                            { system: {}, global: {}, app: {} }
                        )
                    ),
            staleTime: Infinity,
        })),
    });

export const useDefaults = (to, files = CONF_FILES) =>
    useQueries({
        queries: files.map((file) => ({
            queryKey: [to, 'default', file],
            queryFn: () =>
                fetch(
                    `${splunkdPath}/services/badmsc/proxy?${new URLSearchParams({
                        to,
                        uri: `services/properties/${file}/default`,
                        count: '0',
                        output_mode: 'json',
                    })}`,
                    defaultFetchInit
                )
                    .then(handle)
                    .then((data) =>
                        data.entry.reduce((x, { name, content }) => {
                            x[name] = content;
                            return x;
                        }, {})
                    )
                    .catch(() => ({})),
            staleTime: Infinity,
        })),
    });

export const useAcs = (endpoint, parameters = { count: 0 }, options = {}, toast = false) =>
    useQuery({
        queryKey: ['acs', endpoint],
        queryFn: () =>
            fetch(
                `${splunkdPath}/services/badmsc/proxy?${new URLSearchParams({
                    to: 'acs',
                    uri: `adminconfig/v2/${endpoint}`,
                    ...parameters,
                })}`,
                {
                    ...defaultFetchInit,
                    ...options,
                }
            ).then(handle),
        staleTime: Infinity,
    });

export const useUI = (to, folder) =>
    useQuery({
        queryKey: [to, 'ui', folder],
        queryFn: () =>
            fetch(
                `${splunkdPath}/services/badmsc/proxy?${new URLSearchParams({
                    to,
                    uri: `servicesNS/nobody/-/data/ui/${folder}`,
                    count: '0',
                    output_mode: 'json',
                })}`,
                defaultFetchInit
            )
                .then(handle)
                .then((data) =>
                    data.entry.reduce((x, { name, acl, content }) => {
                        x[acl.app] ||= {};
                        x[acl.app][name] = {
                            perms: acl.perms,
                            sharing: acl.sharing,
                            data: content['eai:data'],
                            digest: content['eai:digest'],
                        };
                        return x;
                    }, {})
                ),
        staleTime: Infinity,
    });

export const useLookups = (to) =>
    useQuery({
        queryKey: [to, 'lookups'],
        queryFn: () =>
            fetch(
                `${splunkdPath}/services/badmsc/proxy?${new URLSearchParams({
                    to,
                    uri: 'services/data/lookup-table-files',
                    count: '0',
                    output_mode: 'json',
                })}`,
                defaultFetchInit
            )
                .then(handle)
                .then((data) =>
                    data.entry.reduce((x, { name, acl, content }) => {
                        x[acl.app] ||= {};
                        x[acl.app][name] = {
                            perms: acl.perms,
                            sharing: acl.sharing,
                            path: content['eai:data'],
                        };
                        return x;
                    }, {})
                ),
        staleTime: Infinity,
    });

/*export const useMutationAcs = (endpoint, postprocess) =>
    useMutation({
        mutationFn: (body) =>
            fetch(`${splunkdPath}/services/badmsc/proxy?to=acs&uri=${endpoint}`, {
                ...defaultFetchInit,
                method: 'POST',
                body: JSON.stringify(body),
            })
                .then((res) => {
                    if (!res.ok) return console.warn(res.json());
                    queryClient.invalidateQueries({
                        queryKey: ['acs', endpoint],
                    });
                    return res.json();
                })
                .then(postprocess),
    });*/

export const useProxy = (
    to,
    uri,
    parameters = { count: 0, output_mode: 'json' },
    options = {},
    toast = false,
    postprocess = entry
) =>
    useQuery({
        queryKey: [to, uri],
        queryFn: () =>
            fetch(
                `${splunkdPath}/services/badmsc/proxy?${new URLSearchParams({
                    to,
                    uri,
                    ...parameters,
                })}`,
                {
                    ...defaultFetchInit,
                    ...options,
                }
            )
                .then(handle)
                .then(postprocess),
        staleTime: Infinity,
    });

export const useApi = (...args) => useProxy('api', ...args);

export const useSrc = (...args) => useProxy('src', ...args);

/*export const usePassword = () =>
    useQuery({
        queryKey: ['password'],
        queryFn: () =>
            fetch(
                `${splunkdPath}/servicesNS/${username}/badmsc/storage/passwords/badmsc%3Aauth%3A?output_mode=json&count=1`
            ).then((res) =>
                res.ok
                    ? res
                          .json()
                          .then((data) => JSON.parse(data.entry[0].content.clear_password))
                          .catch(() => ({}))
                    : false
            ),
        staleTime: Infinity,
        notifyOnChangeProps: ['data'],
    });*/
