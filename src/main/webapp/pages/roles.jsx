//! Figure out what capabilities/roles are assignable and only attempt to assign those.

import Button from "@splunk/react-ui/Button";
import Heading from "@splunk/react-ui/Heading";
import Message from "@splunk/react-ui/Message";
import P from "@splunk/react-ui/Paragraph";
import Table from "@splunk/react-ui/Table";
import { Typography } from "@splunk/react-ui/Typography";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useMemo } from "react";
import Header from "../components/Header";
import MutateButton from "../components/MutateButton";
import { request } from "../shared/fetch";
import { dedup } from "../shared/helpers";
import { handle, nameContent, useAcs, useApi, useApps, useConfig } from "../shared/hooks";
import { Page } from "../shared/page";

const ENDPOINT = "services/authorization/roles";
const SYMBOLS = ["!", "+", "~", " "];
const FIELDS = [
    "cumulativeRTSrchJobsQuota",
    "cumulativeSrchJobsQuota",
    "defaultApp",
    "rtSrchJobsQuota",
    "srchDiskQuota",
    "srchFilter",
    "srchJobsQuota",
    "srchTimeEarliest",
    "srchTimeWin",
];

//const nameContent = (data) => Object.fromEntries(data.entry.map(({ name, content }) => [name, content]));

const CreateButton = ({ role, data, exists }) => {
    const config = useConfig();
    if (exists && !data.length) {
        return <Button label="Empty" disabled />;
    }
    const queryClient = useQueryClient();
    let url = `${config.dst.api}/${ENDPOINT}/`;
    exists ? (url += role) : (data = [...data, ["name", role]]);
    const mutation = useMutation(() =>
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
            .then(nameContent)
            .then((newdata) =>
                queryClient.setQueryData(["dst", ENDPOINT], (olddata) => ({
                    ...olddata,
                    [role]: newdata[role],
                }))
            )
            .then(() => asbuilt({ action: "role", new: !exists, role, src: config.src.api, dst: config.dst.api }))
    );

    return <MutateButton mutation={mutation} label={exists ? "Modify" : "Create"} />;
};

const Root = () => {
    const config = useConfig();
    const queryClient = useQueryClient();
    const src = useApi(config.src, ENDPOINT, nameContent);
    const dst = useApi(config.dst, ENDPOINT, nameContent);
    const dstCapabilities = useApi(config.dst, "services/authorization/capabilities", (data) => data.entry[0].content.capabilities);
    const dstIndexes = useAcs(config.dst, "indexes");
    const dstApps = useApps(config.dst);

    const isLoading = src.isLoading || dst.isLoading || dstCapabilities.isLoading || dstIndexes.isLoading || dstApps.isLoading;

    const missingRoles = useMemo(() => {
        if (src.isLoading || dst.isLoading) return [];
        return Object.keys(src.data).filter((role) => !dst.data.hasOwnProperty(role) && !["admin", "sc_admin", "splunk-system-role"].includes(role));
    }, [src.data, dst.data]);

    const roles = useMemo(() => {
        if (isLoading) return [];

        const allowedIndexes = dstIndexes.data.map((i) => i.name);
        allowedIndexes.push("*");
        const allowedApps = Object.keys(dstApps.data);

        return Object.entries(src.data)
            .filter(([name]) => !["admin", "sc_admin", "splunk-system-role"].includes(name))
            .map(([name, srcContent]) => {
                const dstContent = dst.data?.[name] || {
                    capabilities: [],
                    imported_roles: [],
                    srchIndexesAllowed: [],
                    srchIndexesDefault: [],
                    srchIndexesDisallowed: [],
                };

                const others = FIELDS.map((field) => [field, srcContent[field], dstContent[field]]).filter(
                    ([field, src, dst]) =>
                        src &&
                        src !== dst &&
                        (field !== "defaultApp" || allowedApps.includes(src) || console.info(`Ignoring default app '${src}' on role '${name}'`))
                );

                return [
                    name,
                    dedup([...srcContent.capabilities, ...dstContent.capabilities])
                        .filter((cap) => dstCapabilities.data.includes(cap) || console.info(`Ignoring capability '${cap}' on role '${name}'`))
                        .sort()
                        .map((cap) => [cap, SYMBOLS[srcContent.capabilities.includes(cap) + 2 * dstContent.capabilities.includes(cap)]]),
                    dedup([...srcContent.imported_roles, ...dstContent.imported_roles])
                        .sort()
                        .map((role) => [
                            role,
                            SYMBOLS[dst.data.hasOwnProperty(role) * (srcContent.imported_roles.includes(role) + 2 * dstContent.imported_roles.includes(role))],
                        ]),
                    dedup([...srcContent.srchIndexesAllowed, ...dstContent.srchIndexesAllowed])
                        .filter((index) => allowedIndexes.includes(index) || console.info(`Ignoring allowed index '${index}' on role '${name}'`))
                        .sort()
                        .map((index) => [index, SYMBOLS[srcContent.srchIndexesAllowed.includes(index) + 2 * dstContent.srchIndexesAllowed.includes(index)]]),
                    dedup([...srcContent.srchIndexesDefault, ...dstContent.srchIndexesDefault])
                        .filter((index) => allowedIndexes.includes(index) || console.info(`Ignoring default index '${index}' on role '${name}'`))
                        .sort()
                        .map((index) => [index, SYMBOLS[srcContent.srchIndexesDefault.includes(index) + 2 * dstContent.srchIndexesDefault.includes(index)]]),
                    dedup([...srcContent.srchIndexesDisallowed, ...dstContent.srchIndexesDisallowed])
                        .filter((index) => allowedIndexes.includes(index) || console.info(`Ignoring disallowed index '${index}' on role '${name}'`))
                        .sort()
                        .map((index) => [
                            index,
                            SYMBOLS[srcContent.srchIndexesDisallowed.includes(index) + 2 * dstContent.srchIndexesDisallowed.includes(index)],
                        ]),
                    others,
                ];
            });
    }, [src.data, dst.data, dstCapabilities.data, dstIndexes.data, dstApps.data]);

    const createRoles = useMutation(() => {
        return missingRoles.reduce(
            (chain, role) =>
                chain.then(() =>
                    request({
                        url: `${config.dst.api}/${ENDPOINT}/`,
                        method: "POST",
                        data: { name: role },
                        params: { output_mode: "json" },
                        headers: {
                            Authorization: `Bearer ${config.dst.token}`,
                        },
                    })
                        .then(handle)
                        .then(nameContent)
                        .then((newdata) =>
                            queryClient.setQueryData(["dst", ENDPOINT], (olddata) => ({
                                ...olddata,
                                [role]: newdata[role],
                            }))
                        )
                        .catch()
                ),
            Promise.resolve()
        );
    });

    return (
        <>
            <Header title="Create Roles" prev="apps" next="rolesmap" appearance="fill" />
            <Message type="warning">
                KNOWN ISSUES: If a inherited role doesnt exist, you will need to migrate it first. If a capability still has a plus sign after migration, its
                inherited.
            </Message>
            <Heading level={2}>Create Roles</Heading>
            <P>
                If a roles dont exist, then we cannot set it as inherited. So we can create all new roles first to avoid this issue. If this fails, you may not
                have permission to create certain roles in Splunk Cloud.
            </P>
            {missingRoles.length > 0 ? (
                <MutateButton mutation={createRoles} label={`Create the ${missingRoles.length} Missing Role${missingRoles.length > 1 ? "s" : ""}`} />
            ) : (
                <Message appearance="fill" type="success">
                    All roles exist
                </Message>
            )}
            <Heading level={2}>Modify Roles</Heading>
            <P>
                Items marked with a plus (+) only exist on the source, while items marked with a tilde (~) only exist in Splunk Cloud. Nothing will be remove
                from Splunk Cloud to avoid breaking functionality, so this section will merge the two together.
            </P>
            <P>Items marked with an exclamation mark (!) have an issue and will fail. For example an inherited roled or a default app doesnt exist.</P>
            <Table stripeRows>
                <Table.Head>
                    <Table.HeadCell>Role</Table.HeadCell>
                    <Table.HeadCell>Capabilities</Table.HeadCell>
                    <Table.HeadCell>Role Inheritance</Table.HeadCell>
                    <Table.HeadCell>Indexes Allowed</Table.HeadCell>
                    <Table.HeadCell>Indexes Default</Table.HeadCell>
                    <Table.HeadCell>Resources and Restrictions</Table.HeadCell>
                    <Table.HeadCell>Action</Table.HeadCell>
                </Table.Head>
                <Table.Body>
                    {roles.map(([name, capabilities, imported_roles, srchIndexesAllowed, srchIndexesDefault, srchIndexesDisallowed, others]) => (
                        <Table.Row key={name}>
                            <Table.Cell>{name}</Table.Cell>
                            <Table.Cell>
                                <Typography as="pre" variant="monoSmallBody">
                                    {capabilities.map(([cap, x]) => `${x} ${cap}`).join("\n")}
                                </Typography>
                            </Table.Cell>
                            <Table.Cell>
                                <Typography as="pre" variant="monoSmallBody">
                                    {imported_roles.map(([cap, x]) => `${x} ${cap}`).join("\n")}
                                </Typography>
                            </Table.Cell>
                            <Table.Cell>
                                <Typography as="pre" variant="monoSmallBody">
                                    {srchIndexesAllowed.map(([cap, x]) => `${x} ${cap}`).join("\n")}
                                </Typography>
                            </Table.Cell>
                            <Table.Cell>
                                <Typography as="pre" variant="monoSmallBody">
                                    {srchIndexesDefault.map(([cap, x]) => `${x} ${cap}`).join("\n")}
                                </Typography>
                            </Table.Cell>
                            <Table.Cell>
                                <Typography as="pre" variant="monoSmallBody">
                                    {others.map(([cap, s, d]) => `${cap} = ${d || "none"} -> ${s}`).join("\n")}
                                </Typography>
                            </Table.Cell>
                            <Table.Cell>
                                <CreateButton
                                    config={config}
                                    role={name}
                                    data={[
                                        ...capabilities.map(([value]) => ["capabilities", value]),
                                        ...imported_roles.map(([value]) => ["imported_roles", value]),
                                        ...srchIndexesAllowed.map(([value]) => ["srchIndexesAllowed", value]),
                                        ...srchIndexesDefault.map(([value]) => ["srchIndexesDefault", value]),
                                        ...others.map(([attr, src]) => [attr, src]),
                                    ]}
                                    exists={!!dst.data[name]}
                                />
                            </Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table>
            <Heading level={2}>Modify Roles</Heading>
            <P>
                Items marked with a plus (+) only exist on the source, while items marked with a tilde (~) only exist in Splunk Cloud. Nothing will be remove
                from Splunk Cloud to avoid breaking functionality, so this section will merge the two together.
            </P>
        </>
    );
};

Page(<Root />);
