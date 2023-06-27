import Heading from "@splunk/react-ui/Heading";
import P from "@splunk/react-ui/Paragraph";
import Table from "@splunk/react-ui/Table";
import { QueryClient, useMutation } from "@tanstack/react-query";
import React, { useMemo } from "react";
import MutateButton from "../components/MutateButton";
import { ATTR_BLACKLIST, CONF_FILES } from "../shared/const";
import { request } from "../shared/fetch";
import { isort0, latest } from "../shared/helpers";
import { handle, useConfs } from "../shared/hooks";

const MAPPING = {
    "tbegnell@deloitte.com.au": "brett.adams@digihealthni.onmicrosoft.com",
    "troy.begnell1@digitalhealth.gov.au": "brett.adams@digihealthni.onmicrosoft.com",
    "rbaudish@deloitte.com.au": "robbie.baudish@digihealthni.onmicrosoft.com",
    "bretadams@deloitte.com.au": "brett.adams@digihealthni.onmicrosoft.com",
    "izzy.dean@digihealthni.onmicrosoft.com": "robbie.baudish@digihealthni.onmicrosoft.com",
    "rishi.aggarwal@digihealthni.onmicrosoft.com": "Michael.Huff@digihealthni.onmicrosoft.com",
};

export default ({ step, config }) => {
    const files = CONF_FILES;
    const src = useConfs(config.src, files);
    const dst = useConfs(config.dst, files);

    const isLoading = src.some((query) => query.isLoading) || dst.some((query) => query.isLoading);

    const conf = useMemo(() => {
        if (isLoading) return [];
        const fixes = [];
        files.forEach((file, f) => {
            Object.entries(src[f].data || {}).forEach(([app, stanzas]) => {
                if (!dst[f].data[app]) return;
                Object.entries(stanzas).forEach(([stanza, { sharing: src_sharing, perms, owner: src_owner }]) => {
                    if (!dst[f].data?.[app]?.[stanza]) return;
                    const { owner: dst_owner, sharing: dst_sharing } = dst[f].data?.[app]?.[stanza];
                    const new_owner = MAPPING[src_owner] ? MAPPING[src_owner] : src_owner.replace("@digitalhealth.gov.au", "@digihealthni.onmicrosoft.com");

                    if ((dst_owner && dst_owner !== new_owner) || (dst_sharing && dst_sharing !== src_sharing)) {
                        fixes.push([app, file, stanza, src_owner, new_owner, dst_owner, src_sharing, dst_sharing]);
                    }
                });
            });
        });
        return fixes;
    }, [latest(src), latest(dst)]);

    return (
        <div>
            <P>
                App configuration is avaliable to all users but only when inside the specific app contexts during search. If you skipped any apps in the
                previous step, you will not be able to migrate their configuration.
            </P>
            <Heading level={2}>Step {step}.1 - Owners</Heading>
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
        </div>
    );
};

const Fix = ({ config, app, file, stanza, src_owner, src_sharing }) => {
    const queryClient = new QueryClient();
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
        })
            .then(handle)
            .then(() => queryClient.invalidateQueries({ queryKey: ["dst", `servicesNS/nobody/-/configs/conf-${file}`] }))
    );
    return <MutateButton mutation={mutation} label="Fix" />;
};
