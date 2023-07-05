import Message from "@splunk/react-ui/Message";
import Table from "@splunk/react-ui/Table";
import Typography from "@splunk/react-ui/Typography";
import WaitSpinner from "@splunk/react-ui/WaitSpinner";
import { normalizeBoolean } from "@splunk/splunk-utils/boolean";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useMemo } from "react";
import styled from "styled-components";
import { ATTR_BLACKLIST } from "../shared/const";
import { request } from "../shared/fetch";
import { isort0, latest } from "../shared/helpers";
import { appNameConfs, handle, handleAcl, keyContent, makeQuery, nameContent, nameContentAcl, processConfs, useConfig } from "../shared/hooks";
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

export const GlobalConf = ({ file, src_user = "nobody", dst_user = "nobody" }) => {
    const config = useConfig();
    const src_def = useQuery(makeQuery(config.src, `services/properties/${file}/default`, nameContent)).data;
    const src_conf_global = useQuery(makeQuery(config.src, `servicesNS/${src_user}/system/${endpoint(file)}`, nameContentAcl)).data;
    const dst_conf_global = useQuery(makeQuery(config.dst, `servicesNS/${src_user}/system/${endpoint(file)}`, nameContentAcl)).data;
    const dst_apps = useQuery(makeQuery(config.dst, "services/apps/local", keyContent)).data;

    const isLoading = !!src_def && !!src_conf_global && !!dst_conf_global && !!dst_apps;

    const conf = useMemo(() => {
        if (isLoading || src_user !== "nobody") return false;

        const change = {};
        Object.entries(src_conf_global).forEach(([stanza, { acl, content }]) => {
            if (acl.app === "learned" || acl.app === "000-self-service" || !(dst_apps.data[acl.app] || acl.app == "system")) return;
        });
    }, [src_def, src_conf_global, dst_conf_global, dst_apps]);

    return <p>WIP</p>;
};

export const AppConf = ({ file, src_user = "nobody", dst_user = "nobody" }) => {
    const config = useConfig();

    const src_def = useQuery(makeQuery(config.src, `services/properties/${file}/default`, nameContent)).data;
    const src_conf_global = useQuery(makeQuery(config.src, `servicesNS/${src_user}/system/${endpoint(file)}`, nameContentAcl)).data;
    const src_conf_app = useQuery(makeQuery(config.src, `servicesNS/${src_user}/-/${endpoint(file)}`, appNameConfs, { search: "eai:acl.sharing=app" })).data;
    const dst_conf_global = useQuery(makeQuery(config.dst, `servicesNS/${src_user}/system/${endpoint(file)}`, nameContentAcl)).data;
    const dst_conf_app = useQuery(makeQuery(config.dst, `servicesNS/${src_user}/-/${endpoint(file)}`, appNameConfs, { search: "eai:acl.sharing=app" })).data;
    const dst_apps = useQuery(makeQuery(config.dst, "services/apps/local", keyContent)).data;

    const isLoading = !!src_def && !!src_conf_global && !!src_conf_app && !!dst_conf_global && !!dst_conf_app && !!dst_apps;

    const conf = useMemo(() => {
        if (isLoading) return false;

        const change = {};
        Object.entries(src_conf_global).forEach(([app, stanzas]) => {
            if (acl.app === "learned" || acl.app === "000-self-service" || !dst_apps.data[app]) return;

            Object.entries(stanzas).forEach(([stanza, { acl, content }]) => {
                Object.entries(content).forEach(([attr, src_value]) => {
                    if (ATTR_BLACKLIST.includes(attr)) return;
                    const src_norm = normalizeBoolean(src_value);
                    const src_def = normalizeBoolean(src_def[f].data?.[attr]);
                    const src_global = normalizeBoolean(src_conf_global?.[stanza]?.content?.[attr]);
                    const dst_global = normalizeBoolean(dst_conf_global?.[stanza]?.content?.[attr]);
                    const dst_value = dst_conf_app?.[app]?.[stanza]?.content?.[attr];

                    if (src_norm == src_def || src_norm == src_global || src_norm == dst_global || src_value === dst_value) return;

                    change[app] ??= {};
                    change[app][file] ??= {};
                    change[app][file][stanza] ??= {
                        attr: {},
                        acl,
                        dst_acl: dst_conf_app?.[app]?.[stanza]?.acl ?? false,
                    };
                    change[app][file][stanza].attr[attr] = [src_value, dst_value];
                });
            });
        });

        return Object.entries(change)
            .sort(isort0)
            .map(([app, files]) => [
                app,
                Object.entries(files).map(([file, stanzas]) => [
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
    }, [src_def, src_global, src_app, dst_global, dst_app, dst_apps]);

    return isLoading ? (
        <WaitSpinner size="large" />
    ) : conf.length ? (
        <Table stripeRows>
            <Table.Head>
                <Table.HeadCell>App</Table.HeadCell>
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
            });
    });

    return <MutateButton mutation={copy} label={exists ? "Update" : "Create"} />;
};
