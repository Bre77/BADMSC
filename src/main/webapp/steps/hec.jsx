import Button from "@splunk/react-ui/Button";
import Heading from "@splunk/react-ui/Heading";
import P from "@splunk/react-ui/Paragraph";
import Table from "@splunk/react-ui/Table";
import Typography from "@splunk/react-ui/Typography";
import React, { useMemo } from "react";
import { useApi, useConfs, useDefaults } from "../shared/hooks";

const processHecs = (data) =>
    Object.fromEntries(
        data.entry.map(({ name, content }) => [
            name.replace("http://", ""),
            Object.fromEntries(Object.entries(content).filter(([key]) => !key.startsWith("_") && !key.startsWith("eai:"))),
        ])
    );

export default ({ step, config }) => {
    const src = useApi(config.src, "/servicesNS/nobody/-/data/inputs/http", processHecs);
    const dst = useApi(config.dst, "/servicesNS/nobody/-/data/inputs/http", processHecs);

    const hec = useMemo(() => {
        if (!src.data || !dst.data) return [];
        /*const output = [];
        Object.entries(src.data).forEach(([name, content]) => {
            if (!dst.data[name]) {
                output.push({ name, content });
            }
        });
        return Object.entries(src.data);*/
        return Object.entries(src.data).map(([name, content]) => [name, Object.entries(content), Object.entries(dst.data?.[name] || {})]);
    }, [src.data, dst.data]);

    return (
        <div>
            <P>HEC Inputs cannot be created from inputs.conf as they need to be pushed to the indexers.</P>
            <Heading level={2}>Step {step}.1 - Migrate HEC Inputs</Heading>
            <Table stripeRows>
                <Table.Head>
                    <Table.HeadCell>Name</Table.HeadCell>
                    <Table.HeadCell>Local</Table.HeadCell>
                    <Table.HeadCell>Cloud</Table.HeadCell>
                    <Table.HeadCell>Copy</Table.HeadCell>
                </Table.Head>
                <Table.Body>
                    {hec.map(([name, srcContent, dstContent]) => (
                        <Table.Row key={name}>
                            <Table.Cell>{name}</Table.Cell>
                            <Table.Cell>
                                <Typography as="pre" variant="monoSmallBody">
                                    {srcContent.map(([key, value]) => `${key}=${value}`).join("\n")}
                                </Typography>
                            </Table.Cell>
                            <Table.Cell>
                                <Typography as="pre" variant="monoSmallBody">
                                    {dstContent.map(([key, value]) => `${key}=${value}`).join("\n")}
                                </Typography>
                            </Table.Cell>
                            <Table.Cell>
                                <Button appearance="primary">Copy</Button>
                            </Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table>
        </div>
    );
};
