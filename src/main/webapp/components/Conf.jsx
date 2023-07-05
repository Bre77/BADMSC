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
import { isort, isort0, latest } from "../shared/helpers";
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

const sortConf = (change) =>
    Object.entries(change)
        .sort(isort0)
        .map(([app, stanzas]) => [
            app,
            Object.entries(stanzas)
                .sort(isort0)
                .map((x) => {
                    x[1].attr = x[1].attr.sort(isort);
                    return x;
                }),
        ]);

export const GlobalConf = ({ file }) => {
    const config = useConfig();
    const src_def = useQuery(makeQuery(config.src, `services/properties/${file}/default`, nameContent)).data;
    const src_conf_global = useQuery(makeQuery(config.src, `servicesNS/nobody/system/${endpoint(file)}`, nameContentAcl)).data;
    const dst_conf_global = useQuery(makeQuery(config.dst, `servicesNS/nobody/system/${endpoint(file)}`, nameContentAcl)).data;
    const dst_apps = useQuery(makeQuery(config.dst, "services/apps/local", keyContent)).data;

    const isLoading = !src_def || !src_conf_global || !dst_conf_global || !dst_apps;

    const conf = useMemo(() => {
        if (isLoading) return false;

        const change = {};
        Object.entries(src_conf_global).forEach(([stanza, src]) => {
            const app = src.acl.app;
            if (app === "learned" || app === "000-self-service" || !(dst_apps[app] || app == "system")) return;
            const dst = dst_conf_global?.[stanza];
            Object.entries(src.content).forEach(([attr, src_value]) => {
                if (ATTR_BLACKLIST.includes(attr)) return;
                const src_norm = normalizeBoolean(src_value);
                const src_def = normalizeBoolean(src_def?.[stanza]?.[attr]);
                const dst_value = dst?.content?.[attr];

                if (src_norm == src_def || src_value === dst_value) return;

                change[app] ??= {};
                change[app][stanza] ??= {
                    attr: [],
                    src,
                    dst,
                };
                change[app][stanza].attr.push(attr);
            });
        });
        console.log(change);
        return sortConf(change);
    }, [src_def, src_conf_global, dst_conf_global, dst_apps]);

    return <TableConfig conf={conf} file={file} />;
};

export const ScopedConf = ({ file, src_user = "nobody", dst_user = "nobody" }) => {
    const config = useConfig();

    const src_def = useQuery({ ...makeQuery(config.src, `services/properties/${file}/default`, nameContent), cacheTime: 0 }).data;
    const src_conf_global = useQuery({ ...makeQuery(config.src, `servicesNS/${src_user}/system/${endpoint(file)}`, nameContentAcl), cacheTime: 0 }).data;
    const src_conf_app = useQuery({
        ...makeQuery(config.src, `servicesNS/${src_user}/-/${endpoint(file)}`, appNameConfs, { search: "eai:acl.sharing=app" }),
        cacheTime: 0,
    }).data;
    const dst_conf_global = useQuery({ ...makeQuery(config.dst, `servicesNS/${dst_user}/system/${endpoint(file)}`, nameContentAcl), cacheTime: 0 }).data;
    const dst_conf_app = useQuery({
        ...makeQuery(config.dst, `servicesNS/${dst_user}/-/${endpoint(file)}`, appNameConfs, { search: "eai:acl.sharing=app" }),
        cacheTime: 0,
    }).data;
    const dst_apps = useQuery(makeQuery(config.dst, "services/apps/local", keyContent)).data;

    const isLoading = !src_def || !src_conf_global || !src_conf_app || !dst_conf_global || !dst_conf_app || !dst_apps;

    const conf = useMemo(() => {
        if (isLoading) return false;

        const change = {};
        Object.entries(src_conf_app).forEach(([app, stanzas]) => {
            console.log(app);
            if (app === "learned" || app === "000-self-service" || !dst_apps[app]) return;

            Object.entries(stanzas).forEach(([stanza, src]) => {
                const dst = dst_conf_app?.[app]?.[stanza];
                Object.entries(src.content).forEach(([attr, src_value]) => {
                    if (ATTR_BLACKLIST.includes(attr)) return;
                    const src_norm = normalizeBoolean(src_value);
                    const src_def = normalizeBoolean(src_def?.[attr]);
                    const src_global = normalizeBoolean(src_conf_global?.[stanza]?.content?.[attr]);
                    const dst_global = normalizeBoolean(dst_conf_global?.[stanza]?.content?.[attr]);
                    const dst_value = dst?.content?.[attr];

                    if (src_norm == src_def || src_norm == src_global || src_norm == dst_global || src_value === dst_value) return;

                    change[app] ??= {};
                    change[app][stanza] ??= {
                        attr: [],
                        src,
                        dst,
                    };
                    change[app][stanza].attr.push(attr);
                });
            });
        });

        return sortConf(change);
    }, [src_def, src_conf_global, src_conf_app, dst_conf_global, dst_conf_app, dst_apps]);

    return <TableConfig conf={conf} file={file} dst_user={dst_user} />;
};

const TableConfig = ({ conf, file, dst_user = "nobody" }) =>
    conf ? (
        conf.length ? (
            <Table stripeRows>
                <Table.Head>
                    <Table.HeadCell>Local</Table.HeadCell>
                    <Table.HeadCell>Cloud</Table.HeadCell>
                    <Table.HeadCell>Action</Table.HeadCell>
                </Table.Head>
                <Table.Body>
                    {conf.flatMap(([app, stanzas], i) => [
                        <Table.Row key={app}>
                            <Table.Cell>
                                <b>{app}</b>
                            </Table.Cell>
                            <Table.Cell></Table.Cell>
                            <Table.Cell></Table.Cell>
                        </Table.Row>,
                        ...stanzas.map(([stanza, { attr, src, dst }]) => (
                            <Table.Row key={`${app}/${stanza}`}>
                                <CodeCell>
                                    <Typography as="pre" variant="monoSmallBody">
                                        {[
                                            `[${stanza}]`,
                                            ...attr.map((a) => (src?.content?.[a] !== undefined ? `${a} = ${src}` : "")),
                                            /*`(owner = ${acl.owner})`,
                                        `(sharing = ${acl.sharing})`,
                                        `(read = ${acl.perms.read})`,
                                        `(write = ${acl.perms.write})`,*/
                                        ].join("\n")}
                                    </Typography>
                                </CodeCell>
                                <CodeCell>
                                    {!!dst && (
                                        <Typography as="pre" variant="monoSmallBody">
                                            {[`[${stanza}]`, ...attr.map((a) => (dst?.content?.[a] !== undefined ? `${a} = ${dst}` : ""))].join("\n")}
                                        </Typography>
                                    )}
                                </CodeCell>
                                <Table.Cell>
                                    <CopyConfig file={file} app={app} stanza={stanza} src={src} dst={dst} dst_user={dst_user} />
                                </Table.Cell>
                            </Table.Row>
                        )),
                    ])}
                </Table.Body>
            </Table>
        ) : (
            <Message>No modified {file}.conf found</Message>
        )
    ) : (
        <WaitSpinner size="large" />
    );

const CopyConfig = ({ file, app, stanza, src, dst, dst_user }) => {
    const config = useConfig();
    const queryClient = useQueryClient();
    const copy = useMutation(() => {
        let data = src.content;
        let url = `${config.dst.api}/servicesNS/${encodeURIComponent(dst_user)}/${encodeURIComponent(app)}/-/${endpoint(file)}`;
        !!dst ? (url = `${url}/${encodeURIComponent(stanza)}`) : (data = { ...data, name: stanza });
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
            .then(handleAcl(config, !!dst ? url : `${url}/${stanza}`, src, queryClient))
            .then(processConfs)
            .then((newdata) => {
                let newapp = Object.keys(newdata)[0];
                if (newapp !== app) {
                    console.warn(
                        `The new configuration for '${stanza}' was returned in the app '${newapp}' instead of '${app}'. This means it may not show up where you expect it to.`
                    );
                }
                /*queryClient.setQueryData(["dst", `servicesNS/${encodeURIComponent(dst_user)}/-/${endpoint(file)}`], (olddata) => ({
                    ...olddata,
                    [newapp]: { ...olddata?.[newapp], [stanza]: newdata[newapp][stanza] },
                }));*/
            });
    });

    return <MutateButton mutation={copy} label={!!dst ? "Update" : "Create"} />;
};
