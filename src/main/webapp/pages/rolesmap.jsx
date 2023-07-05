import P from "@splunk/react-ui/Paragraph";
import WaitSpinner from "@splunk/react-ui/WaitSpinner";
import React, { useMemo } from "react";
import Header from "../components/Header";
import Mapper from "../components/Mapper";
import { keyContent, useApi, useConfig } from "../shared/hooks";
import { Page } from "../shared/page";

const FILTER = ["splunk-system-role"];

const Root = () => {
    const config = useConfig();
    const src = useApi(config.src, "services/authorization/roles", keyContent).data ?? [];
    const dst = useApi(config.dst, "services/authorization/roles", keyContent).data ?? [];

    const roles = useMemo(() => (src.length && dst.length ? src.filter((x) => !FILTER.includes(x) && !dst.includes(x)) : []), [src, dst]);

    return (
        <>
            <Header title="Role Mapping" prev="roles" next="users" />
            <P>
                If a role has not been created, or its been renamed, you must map the role to avoid failures during the migration. If the customer no longer
                wishes to have that role, create it anyway then delete it post migration. <b>Do not leave any role on this page unmapped.</b>
            </P>
            {roles.length ? roles.map((role) => <Mapper key={role} type="roles" value={role} options={dst} />) : <WaitSpinner size="large" />}
        </>
    );
};

Page(<Root />);
