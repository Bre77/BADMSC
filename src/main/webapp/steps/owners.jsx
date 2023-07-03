import Heading from "@splunk/react-ui/Heading";
import P from "@splunk/react-ui/Paragraph";
import Table from "@splunk/react-ui/Table";
import { QueryClient, useMutation } from "@tanstack/react-query";
import React, { useMemo } from "react";
import MutateButton from "../components/MutateButton";
import { ATTR_BLACKLIST, CONF_FILES } from "../shared/const";
import { request } from "../shared/fetch";
import { isort0, latest } from "../shared/helpers";
import { handle, useApi, useConfs } from "../shared/hooks";

const MAPPING = {
    "tbegnell@deloitte.com.au": "brett.adams@digihealthni.onmicrosoft.com",
    "troy.begnell1@digitalhealth.gov.au": "brett.adams@digihealthni.onmicrosoft.com",
    "rbaudish@deloitte.com.au": "robbie.baudish@digihealthni.onmicrosoft.com",
    "bretadams@deloitte.com.au": "brett.adams@digihealthni.onmicrosoft.com",
    "izzy.dean@digihealthni.onmicrosoft.com": "robbie.baudish@digihealthni.onmicrosoft.com",
    "rishi.aggarwal@digihealthni.onmicrosoft.com": "Michael.Huff@digihealthni.onmicrosoft.com",
};

const handleUi = (data) =>
    data.entry.reduce((x, { name, acl, content }) => {
        x[acl.app] ??= {};
        x[acl.app][name] = {
            acl: { perms: acl.perms, sharing: acl.sharing, owner: acl.owner },
            data: content["eai:data"],
            digest: content["eai:digest"],
            description: content.description,
        };
        return x;
    }, {});

export default ({ step, config }) => {
    const files = CONF_FILES;
    const src_conf = useConfs(config.src, files);
    const dst_conf = useConfs(config.dst, files);
    const src_views = useApi(config.src, `servicesNS/nobody/-/data/ui/views`, handleUi);
    const dst_views = useApi(config.dst, `servicesNS/nobody/-/data/ui/views`, handleUi);

    const isLoading = src_conf.some((query) => query.isLoading) || dst_conf.some((query) => query.isLoading);

    const conf = useMemo(() => {
        if (isLoading) return [];
        const fixes = [];
        files.forEach((file, f) => {
            Object.entries(src_conf[f].data || {}).forEach(([app, stanzas]) => {
                if (!dst_conf[f].data[app]) return;
                Object.entries(stanzas).forEach(([stanza, { sharing: src_sharing, perms, owner: src_owner }]) => {
                    if (!dst_conf[f].data?.[app]?.[stanza]) return;
                    const { owner: dst_owner, sharing: dst_sharing } = dst_conf[f].data?.[app]?.[stanza];
                    const new_owner = MAPPING[src_owner] ? MAPPING[src_owner] : src_owner.replace("@digitalhealth.gov.au", "@digihealthni.onmicrosoft.com");

                    if ((dst_owner && dst_owner !== new_owner) || (dst_sharing && dst_sharing !== src_sharing)) {
                        fixes.push([app, file, stanza, src_owner, new_owner, dst_owner, src_sharing, dst_sharing]);
                    }
                });
            });
        });
        return fixes;
    }, [latest(src_conf), latest(dst_conf)]);

    const isLoadingViews = src_views.isLoading || dst_views.isLoading;

    const views = useMemo(() => {
        if (isLoadingViews) return [];
        const fixes = [];
        Object.entries(src_views.data).forEach(([app, stanzas]) => {
            if (!dst_views.data[app]) return;
            Object.entries(stanzas).forEach(([stanza, { acl }]) => {
                if (!dst_views.data?.[app]?.[stanza]) return;
                const { owner: dst_owner, sharing: dst_sharing } = dst_views.data?.[app]?.[stanza].acl;
                const new_owner = MAPPING[acl.owner] ? MAPPING[acl.owner] : acl.owner.replace("@digitalhealth.gov.au", "@digihealthni.onmicrosoft.com");

                if ((dst_owner && dst_owner !== new_owner) || (dst_sharing && dst_sharing !== acl.sharing)) {
                    fixes.push([app, stanza, acl.owner, new_owner, dst_owner, acl.sharing, dst_sharing]);
                }
            });
        });
        return fixes;
    }, [src_views.data, dst_views.data]);

    return (
        <div>
            <Heading level={2}>Step {step}.1 - KO Owners</Heading>
            <Table stripedRows>
                <Table.Head>
                    <Table.HeadCell>App</Table.HeadCell>
                    <Table.HeadCell>Stanza</Table.HeadCell>
                    <Table.HeadCell>Current Owner</Table.HeadCell>
                    <Table.HeadCell>Original Owner</Table.HeadCell>
                    <Table.HeadCell>New Owner</Table.HeadCell>

                    <Table.HeadCell>Sharing dst > src</Table.HeadCell>
                    <Table.HeadCell>Fix</Table.HeadCell>
                </Table.Head>

                <Table.Body>
                    {conf.map(([app, file, stanza, src_owner, new_owner, dst_owner, src_sharing, dst_sharing], i) => (
                        <Table.Row key={`${app}|${file}|${stanza}`}>
                            <Table.Cell>
                                <b>
                                    {app} / {file}
                                </b>
                            </Table.Cell>
                            <Table.Cell>{stanza}</Table.Cell>
                            <Table.Cell>{dst_owner}</Table.Cell>
                            <Table.Cell>{src_owner}</Table.Cell>
                            <Table.Cell>{new_owner}</Table.Cell>
                            <Table.Cell>
                                {dst_sharing} > {src_sharing}
                            </Table.Cell>
                            <Table.Cell>
                                <Fix config={config} app={app} file={file} stanza={stanza} src_owner={new_owner} src_sharing={src_sharing} />
                            </Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table>
            <Heading level={2}>Step {step}.2 - View Owners</Heading>
            <Table stripedRows>
                <Table.Head>
                    <Table.HeadCell>App</Table.HeadCell>
                    <Table.HeadCell>Stanza</Table.HeadCell>
                    <Table.HeadCell>Current Owner</Table.HeadCell>
                    <Table.HeadCell>Original Owner</Table.HeadCell>
                    <Table.HeadCell>New Owner</Table.HeadCell>
                    <Table.HeadCell>Sharing dst > src</Table.HeadCell>
                    <Table.HeadCell>Fix</Table.HeadCell>
                </Table.Head>

                <Table.Body>
                    {views.map(([app, stanza, src_owner, new_owner, dst_owner, src_sharing, dst_sharing], i) => (
                        <Table.Row key={`${app}|${stanza}`}>
                            <Table.Cell>
                                <b>{app}</b>
                            </Table.Cell>
                            <Table.Cell>{stanza}</Table.Cell>
                            <Table.Cell>{dst_owner}</Table.Cell>
                            <Table.Cell>{src_owner}</Table.Cell>
                            <Table.Cell>{new_owner}</Table.Cell>
                            <Table.Cell>
                                {dst_sharing} > {src_sharing}
                            </Table.Cell>
                            <Table.Cell>
                                <FixView config={config} app={app} stanza={stanza} src_owner={new_owner} src_sharing={src_sharing} />
                            </Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table>
        </div>
    );
};

const Fix = ({ config, app, file, stanza, src_owner, src_sharing }) => {
    const mutation = useMutation(() =>
        request({
            url: `${config.dst.api}/servicesNS/nobody/${encodeURIComponent(app)}/configs/conf-${file}/${encodeURIComponent(stanza)}/acl`,
            method: "POST",
            params: { output_mode: "json" },
            headers: {
                Authorization: `Bearer ${config.dst.token}`,
            },
            data: [
                ["sharing", src_sharing],
                ["owner", src_owner],
            ],
        }).then(handle)
    );
    return <MutateButton mutation={mutation} label="Fix" />;
};

const FixView = ({ config, app, stanza, src_owner, src_sharing }) => {
    const mutation = useMutation(() =>
        request({
            url: `${config.dst.api}/servicesNS/nobody/${encodeURIComponent(app)}/data/ui/views/${encodeURIComponent(stanza)}/acl`,
            method: "POST",
            params: { output_mode: "json" },
            headers: {
                Authorization: `Bearer ${config.dst.token}`,
            },
            data: [
                ["sharing", src_sharing],
                ["owner", src_owner],
            ],
        }).then(handle)
    );
    return <MutateButton mutation={mutation} label="Fix" />;
};
