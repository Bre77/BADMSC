import Table from "@splunk/react-ui/Table";
import Typography from "@splunk/react-ui/Typography";
import WaitSpinner from "@splunk/react-ui/WaitSpinner";
import { normalizeBoolean } from "@splunk/splunk-utils/boolean";
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import React, { useMemo } from "react";
import styled from "styled-components";
import { ATTR_BLACKLIST, CONF_FILES } from "../shared/const";
import { request } from "../shared/fetch";
import { isort0, latest } from "../shared/helpers";
import { handle, handleAcl, processConfs, useApps, useConfs, useDefaults } from "../shared/hooks";
import MutateButton from "./MutateButton";

const CodeCell = styled(Table.Cell)`
    max-width: 40vw;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

export default ({ config, scope = false, files = CONF_FILES }) => {
    const def = useDefaults(config.src, files);
    const src = useConfs(config.src, files);
    const dst = useConfs(config.dst, files);
    const dst_apps = useApps(config.dst);

    const isLoading =
        def.some((query) => query.isLoading) || src.some((query) => query.isLoading) || dst.some((query) => query.isLoading) || dst_apps.isLoading;

    const conf = useMemo(() => {
        if (isLoading) return [];

        const change = {};
        const scopes = {};
        files.forEach((file, f) => {
            if (dst[f].data && src[f].data) {
                Object.entries(src[f].data || {}).forEach(([app, stanzas]) => {
                    if (app === "learned") return;
                    if (scope === "system" || app in dst_apps.data) {
                        Object.entries(stanzas).forEach(([stanza, { sharing, perms, content }]) => {
                            if (scope && sharing != scope) return;
                            const dst_sharing = dst[f].data?.[app]?.[stanza]?.sharing !== scope && dst[f].data?.[app]?.[stanza]?.sharing;

                            if (dst_sharing === "app") {
                                scopes[app] ||= {};
                                scopes[app][file] ||= {};
                                scopes[app][file][stanza] ||= content;
                            }

                            Object.keys(perms).forEach((rw) => perms[rw].map((group) => (group === "admin" ? "sc_admin" : group)));

                            Object.entries(content).forEach(([attr, value]) => {
                                if (!ATTR_BLACKLIST.includes(attr)) {
                                    const src_value = normalizeBoolean(value);
                                    const def_value = normalizeBoolean(def[f].data?.[attr]);
                                    const dst_value = normalizeBoolean(dst[f].data?.[app]?.[stanza]?.content?.[attr]);
                                    const exists = !!dst[f].data?.[app]?.[stanza];

                                    if (src_value !== def_value && src_value !== dst_value) {
                                        change[app] ||= {};
                                        change[app][file] ||= {};
                                        change[app][file][stanza] ||= {
                                            attr: {},
                                            exists,
                                            perms,
                                            sharing,
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

    return isLoading || !conf ? (
        <WaitSpinner size="large" />
    ) : (
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
                        stanzas.map(([stanza, { attr, perms, exists, sharing, dst_sharing }]) => (
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
                                        {[`[${stanza}]`, ...attr.map(([a, { src }]) => (src !== undefined ? `${a} = ${src}` : ""))].join("\n")}
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
                                            sharing,
                                            file,
                                            app,
                                            stanza,
                                            attr,
                                            perms,
                                            exists,
                                        }}
                                    />
                                </Table.Cell>
                            </Table.Row>
                        ))
                    ),
                ])}
            </Table.Body>
        </Table>
    );
};

const CopyConfig = ({ config, sharing, file, app, stanza, attr, perms, exists }) => {
    const queryClient = useQueryClient();
    const copy = useMutation(async () => {
        let data = Object.fromEntries(attr.map(([a, { src }]) => [a, src]));
        console.log("data", data);
        let url = `${config.dst.api}/servicesNS/nobody/${app}/configs/conf-${file}`;
        exists ? (url = `${url}/${stanza}`) : (data["name"] = stanza);
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
            .then(handleAcl(config, url, sharing, perms))
            .then(processConfs)
            .then((newdata) => {
                let newapp = Object.keys(newdata)[0];
                if (newapp !== app) {
                    console.warn(
                        `The new configuration for '${stanza}' was returned in the app '${newapp}' instead of '${app}'. This means it may not show up where you expect it to.`
                    );
                }
                queryClient.setQueryData(["dst", "config", file], (olddata) => ({
                    ...olddata,
                    [newapp]: { ...olddata[newapp], [stanza]: newdata[newapp][stanza] },
                }));
            });
    });

    return <MutateButton mutation={copy} label={exists ? "Update" : "Create"} />;
};
