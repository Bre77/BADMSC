import Code from "@splunk/react-ui/Code";
import Message from "@splunk/react-ui/Message";
import Table from "@splunk/react-ui/Table";
import WaitSpinner from "@splunk/react-ui/WaitSpinner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useMemo } from "react";
import { request } from "../shared/fetch";
import { isort0 } from "../shared/helpers";
import { handle, useApi, useApps } from "../shared/hooks";
import MutateButton from "./mutateButton";

const handleUi = (data) =>
    data.entry.reduce((x, { name, acl, content }) => {
        x[acl.app] ||= {};
        x[acl.app][name] = {
            perms: acl.perms,
            sharing: acl.sharing,
            data: content["eai:data"],
            digest: content["eai:digest"],
            description: content.description,
        };
        return x;
    }, {});

const CopyUi = ({ config, app, folder, file, content, exists }) => {
    console.log(folder, file);
    const queryClient = useQueryClient();
    const mutation = useMutation(async () => {
        let data = { "eai:data": content };
        let url = `${config.dst.api}/servicesNS/nobody/${app}/data/ui/${folder}/`;
        exists ? (url += file) : (data["name"] = file);
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
            .then(handleUi)
            .then((newdata) =>
                queryClient.setQueryData(["dst", `servicesNS/nobody/-/data/ui/${folder}`], (olddata) => ({
                    ...olddata,
                    [app]: { ...olddata[app], [file]: newdata[app][file] },
                }))
            );
    });
    return <MutateButton mutation={mutation} label={exists ? "Overwrite" : "Create"} />;
};

export default ({ config, folder }) => {
    const src = useApi(config.src, `servicesNS/nobody/-/data/ui/${folder}`, handleUi);
    const dst = useApi(config.dst, `servicesNS/nobody/-/data/ui/${folder}`, handleUi);
    const dst_apps = useApps(config.dst);

    const isLoading = dst.isLoading || src.isLoading || dst_apps.isLoading;

    const ui = useMemo(() => {
        if (isLoading) return [];

        const output = {};
        Object.entries(src.data).forEach(([app, files]) => {
            if (app in dst_apps.data) {
                Object.entries(files).forEach(([file, { perms, sharing, data, digest }]) => {
                    if (digest !== dst.data?.[app]?.[file]?.digest) {
                        Object.keys(perms).forEach((rw) => perms[rw].map((group) => (group === "admin" ? "sc_admin" : group)));
                        output[app] ||= {};
                        output[app][file] = {
                            perms,
                            sharing,
                            src: data,
                            dst: dst.data?.[app]?.[file]?.data,
                        };
                    }
                });
            } else console.log(`Skipping ${app} because its not in cloud`);
        });
        return Object.entries(output)
            .sort(isort0)
            .map(([app, files]) => [app, Object.entries(files).sort(isort0)]);
    }, [dst.data, src.data, dst_apps.data]);

    const detailRow = (src, dst) => (
        <Table.Row>
            <Table.Cell></Table.Cell>
            <Table.Cell>
                <Code language="xml" value={src} />
            </Table.Cell>
            <Table.Cell>
                <Code language="xml" value={dst} />
            </Table.Cell>
            <Table.Cell></Table.Cell>
        </Table.Row>
    );

    return isLoading ? (
        <WaitSpinner size="large" />
    ) : ui.length ? (
        <Table stripeRows rowExpansion="single">
            <Table.Head>
                <Table.HeadCell>Name</Table.HeadCell>
                <Table.HeadCell>Local</Table.HeadCell>
                <Table.HeadCell>Cloud</Table.HeadCell>
                <Table.HeadCell>Action</Table.HeadCell>
            </Table.Head>
            <Table.Body>
                {ui.flatMap(([app, files]) =>
                    files.map(([file, { perms, sharing, src, dst }]) => (
                        <Table.Row key={app + "/" + file} expansionRow={detailRow(src, dst)}>
                            <Table.Cell>
                                <b>{app}</b> / {file}.xml
                            </Table.Cell>
                            <Table.Cell>{src && `${src.split("\n").length} Lines`}</Table.Cell>
                            <Table.Cell>{dst && `${dst.split("\n").length} Lines`}</Table.Cell>
                            <Table.Cell>
                                <CopyUi config={config} app={app} folder={folder} file={file} content={src} exists={!!dst} />
                            </Table.Cell>
                        </Table.Row>
                    ))
                )}
            </Table.Body>
        </Table>
    ) : (
        <Message>No modified {folder} found</Message>
    );
};
