import Message from "@splunk/react-ui/Message";
import Table from "@splunk/react-ui/Table";
import Typography from "@splunk/react-ui/Typography";
import WaitSpinner from "@splunk/react-ui/WaitSpinner";
import { normalizeBoolean } from "@splunk/splunk-utils/boolean";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useMemo } from "react";
import styled from "styled-components";
import { ATTR_BLACKLIST, CONF_FILES } from "../shared/const";
import { request } from "../shared/fetch";
import { isort0, latest } from "../shared/helpers";
import { handle, handleAcl, processConfs, useApps, useConfig, useConfs, useDefaults } from "../shared/hooks";
import MutateButton from "./MutateButton";

const CodeCell = styled(Table.Cell)`
    max-width: 40vw;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

// Override certain config files to use specific endpoints
const ENDPOINTS = {
    savedsearches: "saved/searches",
};
const endpoint = (file) => ENDPOINTS[file] ?? `configs/conf-${file}`;

export default ({ config, scope = false, files = CONF_FILES, src_user = "nobody", dst_user = "nobody" }) => {
    const def = useDefaults(config.src, files);
    const src = useConfs(config.src, files, src_user);
    const dst = useConfs(config.dst, files, dst_user);
    const dst_apps = useApps(config.dst);

    /* Prefetching for ACLs, however this can be wasteful
    const queryClient = useQueryClient();
    queryClient.prefetchQuery(makeQuery(config.dst, "services/authentication/users", nameContent));
    queryClient.prefetchQuery(makeQuery(config.dst, "services/authorization/roles", nameContent));
    */

    const isLoading =
        def.some((query) => query.isLoading) || src.some((query) => query.isLoading) || dst.some((query) => query.isLoading) || dst_apps.isLoading;

    //? This doesnt change when the data is changed
    const conf = useMemo(() => {
        if (isLoading) return [];

        const change = {};
        //const scopes = {};
        files.forEach((file, f) => {
            if (dst[f].data && src[f].data) {
                // Grab all the global content so we dont write it in an app scope
                const dst_global = dst[f].data?.system || {};
                //console.log(dst_global);
                Object.entries(dst[f].data)
                    .sort(([appA], [appB]) => (appA < appB ? 1 : -1)) // Emulated Splunks lexographic sorting
                    .forEach(([app, stanzas]) => {
                        Object.entries(stanzas).forEach(([stanza, content]) => {
                            if (content.sharing == "global") {
                                dst_global[stanza] = content;
                            }
                        });
                    });

                Object.entries(src[f].data || {}).forEach(([app, stanzas]) => {
                    if (app === "learned" || app === "000-self-service") return;
                    if (scope === "system" || app in dst_apps.data) {
                        Object.entries(stanzas).forEach(([stanza, { sharing, perms, content, owner }]) => {
                            if (scope && sharing != scope) return;
                            const dst_sharing = dst[f].data?.[app]?.[stanza]?.sharing !== scope && dst[f].data?.[app]?.[stanza]?.sharing;

                            /*if (dst_sharing === "app") {
                                scopes[app] ??= {};
                                scopes[app][file] ??= {};
                                scopes[app][file][stanza] ??= content;
                            }*/

                            //perms && Object.keys(perms).forEach((rw) => perms[rw].map((group) => (group === "admin" ? "sc_admin" : group)));

                            Object.entries(content).forEach(([attr, src_value]) => {
                                if (!ATTR_BLACKLIST.includes(attr)) {
                                    const dst_value = dst[f].data?.[app]?.[stanza]?.content?.[attr];
                                    const src_norm = normalizeBoolean(src_value);
                                    const exists = !!dst[f].data?.[app]?.[stanza];

                                    if (
                                        src_norm !== normalizeBoolean(def[f].data?.[attr]) && // Default
                                        src_value !== dst_value && //normalizeBoolean(dst_value) && // Destination (Maybe these should be identical, not equal)
                                        src_norm !== normalizeBoolean(dst_global?.[stanza]?.content?.[attr]) // Destination Global
                                    ) {
                                        change[app] ??= {};
                                        change[app][file] ??= {};
                                        change[app][file][stanza] ??= {
                                            attr: {},
                                            acl: { perms, sharing, owner },
                                            exists,
                                            dst_sharing,
                                        };
                                        change[app][file][stanza].attr[attr] = {
                                            src: src_value,
                                            dst: dst_value,
                                        };
                                    }
                                }
                            });
                        });
                    }
                });
            }
        });
        return Object.entries(change)
            .sort(isort0)
            .map(([app, files]) => [
                app,
                Object.entries(files).map(([file, stanzas]) => [
                    file,
                    Object.entries(stanzas)
                        .sort(isort0)
                        .map(([stanza, content]) => [
                            stanza,
                            {
                                ...content,
                                attr: Object.entries(content.attr).sort(isort0),
                            },
                        ]),
                ]),
            ]);
    }, [latest(def), latest(src), latest(dst), dst_apps.data]);

    return isLoading ? (
        <WaitSpinner size="large" />
    ) : conf.length ? (
        <Table stripeRows>
            <Table.Head>
                <Table.HeadCell>File</Table.HeadCell>
                <Table.HeadCell>Local</Table.HeadCell>
                <Table.HeadCell>Cloud</Table.HeadCell>
                <Table.HeadCell>Action</Table.HeadCell>
            </Table.Head>
            <Table.Body>
                {conf.flatMap(([app, files], i) => [
                    <Table.Row key={app}>
                        <Table.Cell>
                            <b>{app}</b>
                        </Table.Cell>
                        <Table.Cell></Table.Cell>
                        <Table.Cell></Table.Cell>
                        <Table.Cell></Table.Cell>
                    </Table.Row>,
                    ...files.flatMap(([file, stanzas]) =>
                        stanzas.map(([stanza, { attr, acl, exists, dst_sharing }]) => (
                            <Table.Row key={app + file + stanza}>
                                <Table.Cell>
                                    {app} / {file}.conf
                                    {dst_sharing && (
                                        <b>
                                            <br />
                                            Sharing is {dst_sharing}
                                        </b>
                                    )}
                                </Table.Cell>
                                <CodeCell>
                                    <Typography as="pre" variant="monoSmallBody">
                                        {[
                                            `[${stanza}]`,
                                            ...attr.map(([a, { src }]) => (src !== undefined ? `${a} = ${src}` : "")),
                                            /*`(owner = ${acl.owner})`,
                                            `(sharing = ${acl.sharing})`,
                                            `(read = ${acl.perms.read})`,
                                            `(write = ${acl.perms.write})`,*/
                                        ].join("\n")}
                                    </Typography>
                                </CodeCell>
                                <CodeCell>
                                    {exists && (
                                        <Typography as="pre" variant="monoSmallBody">
                                            {[`[${stanza}]`, ...attr.map(([a, { dst }]) => (dst !== undefined ? `${a} = ${dst}` : ""))].join("\n")}
                                        </Typography>
                                    )}
                                </CodeCell>
                                <Table.Cell>
                                    <CopyConfig
                                        {...{
                                            config,
                                            acl,
                                            file,
                                            app,
                                            stanza,
                                            attr,
                                            exists,
                                            dst_user,
                                        }}
                                    />
                                </Table.Cell>
                            </Table.Row>
                        ))
                    ),
                ])}
            </Table.Body>
        </Table>
    ) : (
        <Message>No modified conf files found</Message>
    );
};

const CopyConfig = ({ config, acl, file, app, stanza, attr, exists, dst_user }) => {
    const queryClient = useQueryClient();
    const copy = useMutation(() => {
        let data = Object.fromEntries(attr.map(([a, { src }]) => [a, src]));
        let url = `${config.dst.api}/servicesNS/${encodeURIComponent(dst_user)}/${encodeURIComponent(app)}/-/${endpoint(file)}`;
        exists ? (url = `${url}/${encodeURIComponent(stanza)}`) : (data["name"] = stanza);
        return request({
            url,
            method: "POST",
            data,
            params: { output_mode: "json" },
            headers: {
                Authorization: `Bearer ${config.dst.token}`,
            },
        })
            .then(handle)
            .then(handleAcl(config, exists ? url : `${url}/${stanza}`, acl, queryClient))
            .then(processConfs)
            .then((newdata) => {
                let newapp = Object.keys(newdata)[0];
                if (newapp !== app) {
                    console.warn(
                        `The new configuration for '${stanza}' was returned in the app '${newapp}' instead of '${app}'. This means it may not show up where you expect it to.`
                    );
                }
                queryClient.setQueryData(["dst", `servicesNS/${encodeURIComponent(dst_user)}/-/${endpoint(file)}`], (olddata) => ({
                    ...olddata,
                    [newapp]: { ...olddata?.[newapp], [stanza]: newdata[newapp][stanza] },
                }));
            })
            .then(() => asbuilt({ action: "config", new: !dst, file, app, stanza, attr, src: config.src.api, dst: config.dst.api, dst_user }));
    });

    return <MutateButton mutation={copy} label={exists ? "Update" : "Create"} />;
};
