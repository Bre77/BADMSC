import P from "@splunk/react-ui/Paragraph";
import WaitSpinner from "@splunk/react-ui/WaitSpinner";
import React, { useContext, useMemo } from "react";
import Header from "../components/Header";
import Mapper from "../components/Mapper";
import { keyContent, useApi, useConfig } from "../shared/hooks";
import { Config, Page } from "../shared/page";

const Root = () => {
    const config = useConfig();
    const src = useApi(config.src, "services/authentication/users", keyContent).data ?? [];
    const dst = useApi(config.dst, "services/authentication/users", keyContent).data ?? [];

    const users = useMemo(() => (src.length && dst.length ? src.filter((x) => !dst.includes(x)) : []), [src, dst]);

    return (
        <>
            <Header title="User Mapping" prev="users" next="parsing" />
            <P>
                If a user has not been created, or its been renamed, you must map the user to avoid failures during the migration. If the customer no longer
                wishes to have that user, map it to nobody. <b>Do not leave any user on this page unmapped.</b>
            </P>
            {users.length ? users.map((user) => <Mapper type="users" key={user} value={user} options={["nobody", ...dst]} />) : <WaitSpinner size="large" />}
        </>
    );
};

Page(<Root />);
