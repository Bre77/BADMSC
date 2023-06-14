import React from "react";

// Splunk UI
import Heading from "@splunk/react-ui/Heading";
import P from "@splunk/react-ui/Paragraph";
import Select from "@splunk/react-ui/Select";
import Conf from "../components/Conf";

export default ({ step, config }) => {
    [src_user, setSrcUser] = useState();
    [dst_user, setDstUser] = useState();
    const src_users = useApi(config.src, "services/authentication/users", (data) => data.entry.map((e) => e.name));
    const dst_users = useApi(config.dst, "services/authentication/users", (data) => data.entry.map((e) => e.name));
    return (
        <div>
            <P>
                User (private) knowledge objects can be transferred as long as the user exists in Splunk Cloud. If you are using SSO then this requires them to
                have logged in once.
            </P>
            <Heading level={2}>Step {step}.1 - Select Source and Destination User</Heading>

            <Heading level={2}>Step {step}.2 - Copy Private Knowledge Objects</Heading>
            <Conf config={config} files={["savedsearches", "eventtypes", "tags", "fieldaliases", "macros", "workflowactions"]} />
        </div>
    );
};
