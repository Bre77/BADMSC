import React, { useState } from "react";

// Splunk UI
import ControlGroup from "@splunk/react-ui/ControlGroup";
import Heading from "@splunk/react-ui/Heading";
import P from "@splunk/react-ui/Paragraph";
import Select from "@splunk/react-ui/Select";
import Conf from "../components/Conf";
import Lookup from "../components/Lookup";
import Ui from "../components/Ui";
import { useApi } from "../shared/hooks";

export default ({ step, config }) => {
    const [src_user, setSrcUser] = useState("");
    const handleSrcUser = (e, { value }) => setSrcUser(value);
    const [dst_user, setDstUser] = useState("");
    const handleDstUSer = (e, { value }) => setDstUser(value);
    const src_users = useApi(config.src, "services/authentication/users", (data) => data.entry.map((e) => e.name));
    const dst_users = useApi(config.dst, "services/authentication/users", (data) => data.entry.map((e) => e.name));
    return (
        <>
            <P>
                User (private) knowledge objects can be transferred as long as the user exists in Splunk Cloud. If you are using SSO then this requires them to
                have logged in once.
            </P>
            <Heading level={2}>Step {step}.1 - Select User</Heading>
            <ControlGroup label="Source User" inline style={{ width: "30em" }}>
                <Select value={src_user} onChange={handleSrcUser} options={src_users.data} disabled={src_users.isLoading}>
                    {src_users.data?.map((user) => (
                        <Select.Option key={user} label={user} value={user} />
                    ))}
                </Select>
            </ControlGroup>
            <ControlGroup label="Destination User" inline style={{ width: "30em" }}>
                <Select value={dst_user} onChange={handleDstUSer} options={dst_users.data} disabled={dst_users.isLoading}>
                    {dst_users.data?.map((user) => (
                        <Select.Option key={user} label={user} value={user} />
                    ))}
                </Select>
            </ControlGroup>
            {src_user && dst_user && (
                <>
                    <Heading level={2}>Step {step}.2 - Copy Private Knowledge Objects</Heading>
                    <Conf config={config} scope="user" src_user={src_user} dst_user={dst_user} />
                    <Heading level={2}>Step {step}.3 - Copy Private Dashboards</Heading>
                    <Ui config={config} scope="user" folder="views" src_user={src_user} dst_user={dst_user} />
                    <Heading level={2}>Step {step}.4 - Copy Private Nav</Heading>
                    <Ui config={config} scope="user" folder="nav" src_user={src_user} dst_user={dst_user} />
                </>
            )}
        </>
    );
};
