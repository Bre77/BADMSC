import ControlGroup from "@splunk/react-ui/ControlGroup";
import Heading from "@splunk/react-ui/Heading";
import Link from "@splunk/react-ui/Link";
import Message from "@splunk/react-ui/Message";
import P from "@splunk/react-ui/Paragraph";
import Select from "@splunk/react-ui/Select";
import React, { useState } from "react";
import { ScopedConf } from "../components/Conf";
import Header from "../components/Header";
import Lookup from "../components/Lookup";
import Ui from "../components/Ui";
import { CONF_FILES } from "../shared/const";
import { keyContent, useApi, useConfig, useMaps } from "../shared/hooks";
import { Page } from "../shared/page";

const Root = () => {
    const config = useConfig();
    const src_users = useApi(config.src, "services/authentication/users", keyContent);
    const users = useMaps()?.users;

    const [src_user, setSrcUser] = useState("");
    const handleSrcUser = (e, { value }) => setSrcUser(value);
    const dst_user = users?.[src_user] ?? src_user;

    /*const nextUser = () => {
        src_users.data.indexOf(src_user) + 1 < src_users.data.length
            ? setSrcUser(src_users.data[src_users.data.indexOf(src_user) + 1])
            : setSrcUser(src_users.data[0]);
    };*/

    return (
        <>
            <Header title="Private Config" prev="config" next="nav" />
            <P>
                User (private) knowledge objects can be transferred as long as the user exists in Splunk Cloud. If you are using SSO then this requires them to
                have logged in once.
            </P>
            <Heading level={2}>Select User</Heading>
            <ControlGroup label="Source User" style={{ width: "30em" }}>
                <Select inline value={src_user} onChange={handleSrcUser} options={src_users.data} disabled={src_users.isLoading}>
                    {src_users.data?.map((user) => (
                        <Select.Option key={user} label={user} value={user} />
                    ))}
                </Select>
            </ControlGroup>
            <ControlGroup label="Destination User" style={{ width: "30em" }}>
                <P>{dst_user}</P>
            </ControlGroup>
            {users &&
                src_user &&
                dst_user &&
                (dst_user == "nobody" ? (
                    <Message type="error">
                        The "nobody" owner cannot own private knowledge objects. Either <Link to="users">create the user</Link> or{" "}
                        <Link to="usersmap">map it someone other than nobody</Link>.
                    </Message>
                ) : (
                    <>
                        <Heading level={2}>Copy Private Knowledge Objects</Heading>
                        {CONF_FILES.map((file) => (
                            <>
                                <Heading level={3}>{file}.conf</Heading>
                                <ScopedConf src_user={src_user} dst_user={dst_user} file={file} />
                            </>
                        ))}
                        <Heading level={2}>Copy Private Dashboards</Heading>
                        <Ui config={config} scope="user" folder="views" src_user={src_user} dst_user={dst_user} />
                        <Heading level={2}>Copy Private Nav</Heading>
                        <Ui config={config} scope="user" folder="nav" src_user={src_user} dst_user={dst_user} />
                        <Heading level={2}>Copy Private CSV Lookups</Heading>
                        <Lookup config={config} scope="user" type="csv" src_user={src_user} dst_user={dst_user} />
                    </>
                ))}
        </>
    );
};
//<Lookup config={config} scope="user" type="csv" src_user={src_user} dst_user={dst_user} />
//<Lookup config={config} scope="user" type="csv" src_user={src_user} dst_user={dst_user} />
Page(<Root />);
