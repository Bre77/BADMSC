import Message from "@splunk/react-ui/Message";
import P from "@splunk/react-ui/Paragraph";
import Table from "@splunk/react-ui/Table";
import Typography from "@splunk/react-ui/Typography";
import WaitSpinner from "@splunk/react-ui/WaitSpinner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useMemo } from "react";
import Header from "../components/Header";
import MutateButton from "../components/MutateButton";
import { request } from "../shared/fetch";
import { handle, useApi, useConfig, useLock } from "../shared/hooks";
import { Page } from "../shared/page";

const IDX_LIMIT = 8;

const Root = () => {
    const config = useConfig();
    const src = useApi(config.src, "servicesNS/nobody/-/data/inputs/http", processApiHec);
    const dst = useApi(config.dst, "servicesNS/nobody/-/data/inputs/http", processApiHec);
    //const dst = useAcs(config.dst, "inputs/http-event-collectors", processAcsHec);
    const loading = src.isLoading || dst.isLoading;

    const lock = useLock();

    const hec = useMemo(() => {
        if (loading) return [];
        return Object.keys(src.data).map((name) => {
            const srcContent = { ...src.data?.[name] };
            const dstContent = { ...dst.data?.[name] };

            if (srcContent.indexes) {
                srcContent.indexes =
                    srcContent.indexes.length > IDX_LIMIT
                        ? `${srcContent.indexes.slice(0, IDX_LIMIT).join(",")} (and ${srcContent.indexes.length - IDX_LIMIT} more)`
                        : srcContent.indexes.join(",");
            }
            if (dstContent?.indexes) {
                dstContent.indexes =
                    dstContent.indexes.length > IDX_LIMIT
                        ? `${dstContent.indexes.slice(0, IDX_LIMIT).join(",")} (and ${dstContent.indexes.length - IDX_LIMIT} more)`
                        : dstContent.indexes.join(",");
            }
            return [name, Object.entries(srcContent), Object.entries(dstContent || {})];
        });
    }, [src.data, dst.data]);

    return (
        <>
            <Header title="HTTP Event Collector" prev="parsing" next="inputs" />
            <P>HEC Inputs cannot be created from inputs.conf as they need to be pushed to the indexers.</P>
            {loading ? (
                <WaitSpinner size="medium" />
            ) : hec.length ? (
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
                                        {srcContent.map(([key, value]) => `${key} = ${value}`).join("\n")}
                                    </Typography>
                                </Table.Cell>
                                <Table.Cell>
                                    <Typography as="pre" variant="monoSmallBody">
                                        {dstContent.map(([key, value]) => `${key} = ${value}`).join("\n")}
                                    </Typography>
                                </Table.Cell>
                                <Table.Cell>
                                    <CopyHec name={name} content={src.data[name]} exists={!!dstContent.length} lock={lock} />
                                </Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table>
            ) : (
                <Message>No HEC Tokens found</Message>
            )}
        </>
    );
};

const processApiHec = (data) =>
    Object.fromEntries(
        data.entry
            .filter(({ name }) => name != "http")
            .map(({ name, content }) => [
                name.replace("http://", ""),
                Object.fromEntries(
                    Object.entries(content).filter(([key]) => !key.startsWith("_") && !key.startsWith("eai:") && key != "run_only_one" && key != "host")
                ),
            ])
    );
/*const processAcsHec = (data) =>
    Object.fromEntries(
        data["http-event-collectors"].map(({ token, spec }) => [
            spec.name,
            {
                ...spec,
                token,
            },
        ])
    );*/

const CopyHec = ({ name, content, exists, lock }) => {
    const config = useConfig();
    const queryClient = useQueryClient();
    const mutation = useMutation(async () => {
        let data = { ...content };
        console.log(content);
        if (data.indexes) {
            data.indexes = data.indexes.join(",");
        }
        let url = `${config.dst.api}/services/data/inputs/http/`;
        exists ? (url += name) : (data["name"] = name);
        return lock().then((unlock) =>
            request({
                url,
                method: "POST",
                data,
                params: { output_mode: "json" },
                headers: {
                    Authorization: `Bearer ${config.dst.token}`,
                },
            })
                .then(handle)
                .then(processApiHec)
                .then((newdata) => queryClient.invalidateQueries(["dst", "servicesNS/nobody/-/data/inputs/http"])) // , (olddata) => ({ ...olddata, ...newdata })
                .finally(unlock)
        );
    });
    return <MutateButton mutation={mutation} label={exists ? "Overwrite" : "Create"} />;
};

Page(<Root />);
