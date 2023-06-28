import Heading from "@splunk/react-ui/Heading";
import P from "@splunk/react-ui/Paragraph";
import Table from "@splunk/react-ui/Table";
import { normalizeBoolean } from "@splunk/splunk-utils/boolean";
import { QueryClient, useMutation } from "@tanstack/react-query";
import React, { useMemo } from "react";
import MutateButton from "../components/MutateButton";
import { request } from "../shared/fetch";
import { isort0, latest } from "../shared/helpers";
import { handle, processConfs, useApi } from "../shared/hooks";

export default ({ step, config }) => {
    const src = useApi(config.src, "servicesNS/nobody/-/saved/searches", processConfs);
    const dst = useApi(config.dst, "servicesNS/nobody/-/saved/searches", processConfs);

    const isLoading = src.isLoading || dst.isLoading;

    const searches = useMemo(() => {
        if (isLoading) return [];
        const fixes = [];

        //        "alert_threshold": "0",
        //"alert_type": "number of events",
        Object.entries(src.data || {}).forEach(([app, stanzas]) => {
            if (!dst.data[app]) return;
            Object.entries(stanzas).forEach(([stanza, { content }]) => {
                let d = dst.data?.[app]?.[stanza]?.content;
                if (!d) return;
                //console.log(stanza, JSON.stringify([content.alert_threshold, d.alert_threshold, content.alert_type, d.alert_type]));
                if (normalizeBoolean(content["action.correlationsearch.enabled"]) && !normalizeBoolean(content.disabled)) {
                    // d.alert_threshold d.alert_type
                    fixes.push([
                        app,
                        stanza,
                        content.alert_threshold,
                        d.alert_threshold,
                        content.alert_type,
                        d.alert_type,
                        content["action.notable.param.security_domain"],
                    ]);
                }
            });
        });
        return fixes;
    }, [src.data, dst.data]);

    return (
        <div>
            <Heading level={2}>Step {step}.1 - Saved Searches</Heading>
            <Table stripedRows>
                <Table.Head>
                    <Table.HeadCell>App</Table.HeadCell>
                    <Table.HeadCell>Stanza</Table.HeadCell>
                    <Table.HeadCell>Domain</Table.HeadCell>
                    <Table.HeadCell>Threshold</Table.HeadCell>
                    <Table.HeadCell>Type</Table.HeadCell>
                    <Table.HeadCell>Fix</Table.HeadCell>
                </Table.Head>

                <Table.Body>
                    {searches.map(([app, stanza, src_threshold, dst_threshold, src_type, dst_type, domain], i) => (
                        <Table.Row key={`${app}|${stanza}`}>
                            <Table.Cell>
                                <b>{app}</b>
                            </Table.Cell>
                            <Table.Cell>{stanza}</Table.Cell>
                            <Table.Cell>{domain}</Table.Cell>
                            <Table.Cell>{JSON.stringify([src_threshold, dst_threshold])}</Table.Cell>
                            <Table.Cell>{JSON.stringify([src_type, dst_type])}</Table.Cell>
                            <Table.Cell>
                                <Fix config={config} app={app} stanza={stanza} threshold={src_threshold} type={src_type} />
                            </Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table>
        </div>
    );
};

const Fix = ({ config, app, stanza, threshold, type }) => {
    const mutation = useMutation(() =>
        request({
            url: `${config.dst.api}/servicesNS/nobody/${encodeURIComponent(app)}/saved/searches/${encodeURIComponent(stanza)}`,
            method: "POST",
            params: { output_mode: "json" },
            headers: {
                Authorization: `Bearer ${config.dst.token}`,
            },
            data: [
                ["alert_threshold", threshold],
                ["alert_type", type],
            ],
        }).then(handle)
    );
    return <MutateButton mutation={mutation} label="Fix" />;
};
