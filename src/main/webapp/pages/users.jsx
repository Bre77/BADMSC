import Heading from "@splunk/react-ui/Heading";
import Message from "@splunk/react-ui/Message";
import P from "@splunk/react-ui/Paragraph";
import Table from "@splunk/react-ui/Table";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useMemo } from "react";
import Header from "../components/Header";
import MutateButton from "../components/MutateButton";
import { request } from "../shared/fetch";
import { handle, keyContent, nameContent, useApi, useConfig, useMaps } from "../shared/hooks";
import { Page } from "../shared/page";

const CreateButton = ({ data }) => {
    const queryClient = useQueryClient();
    const config = useConfig();
    const mutation = useMutation(async () => {
        let x = [
            ["name", data.name],
            ["realname", data.realname],
            ["email", data.email],
            ["restart_background_jobs", data.restart_background_jobs],
            ["password", "changeme"],
            ["force-change-pass", true],
            ["tz", data.tz],
            ["defaultApp", data.defaultApp],
            ...data.roles.map((x) => x[1]),
        ];
        return request({
            url: `${config.dst.api}/services/authentication/users`,
            method: "POST",
            data: x,
            params: { output_mode: "json" },
            headers: {
                Authorization: `Bearer ${config.dst.token}`,
            },
        })
            .then(handle)
            .then(() => queryClient.invalidateQueries(["dst", "services/authentication/users"]))
            .then(() => asbuilt({ action: "user", new: true, data, src: config.src.api, dst: config.dst.api }));
    });
    return <MutateButton mutation={mutation} label="Create" />;
};

const Root = () => {
    const config = useConfig();
    const src = useApi(config.src, "services/authentication/users", nameContent);
    const dst = useApi(config.dst, "services/authentication/users", nameContent);
    const { roles } = useMaps();
    const dstApps = useApi(config.dst, "services/apps/local", keyContent);

    const isLoading = src.isLoading || dst.isLoading || dstApps.isLoading || !roles;

    const users = useMemo(() => {
        if (isLoading) return [];
        return Object.entries(src.data)
            .filter(([name]) => !dst.data[name] && name !== "admin")
            .map(([name, data]) => ({
                ...data,
                roles: data.roles.map((x) => [x, roles[x] ?? x]),
                defaultApp: data.defaultAppIsUserOverride && dstApps.data.includes(data.defaultApp) ? data.defaultApp : null,
                name: name,
            }));
    }, [src.data, dst.data, roles, dstApps.data]);

    console.log(users);

    return (
        <>
            <Header title="Users" prev="rolemap" next="usersmap" />
            <Heading level={2}>Create Users</Heading>
            <P>
                If you want to preserve knowledge object ownership, or migrate all private knowledge objects, then you need to migrate all user accounts. This
                can be problematic if Splunk Cloud is going to use SSO/SAML, as it would require every use to login before you perform migration. Alternatively
                you can create every user here, and then delete them (leaving orphaned knowledge objects) post migration. Any users that are not created here
                must be mapped on the next page.
            </P>
            {users.length ? (
                <Table stripeRows>
                    <Table.Head>
                        <Table.HeadCell>User</Table.HeadCell>
                        <Table.HeadCell>Name</Table.HeadCell>
                        <Table.HeadCell>Email</Table.HeadCell>
                        <Table.HeadCell>Default App</Table.HeadCell>
                        <Table.HeadCell>Roles</Table.HeadCell>
                        <Table.HeadCell>Timezone</Table.HeadCell>
                        <Table.HeadCell>Create</Table.HeadCell>
                    </Table.Head>
                    <Table.Body>
                        {users.map((user) => (
                            <Table.Row key={user.name}>
                                <Table.Cell>{user.name}</Table.Cell>
                                <Table.Cell>{user.realname}</Table.Cell>
                                <Table.Cell>{user.email}</Table.Cell>
                                <Table.Cell>{user.defaultApp}</Table.Cell>
                                <Table.Cell>{user.roles.map(([a, b]) => (a == b ? a : `${a} > ${b}`)).join(", ")}</Table.Cell>
                                <Table.Cell>{user.tz}</Table.Cell>
                                <Table.Cell>
                                    <CreateButton data={user} />
                                </Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table>
            ) : (
                <Message type="success">All users have been created</Message>
            )}
        </>
    );
};

Page(<Root />);
