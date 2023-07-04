import Select from "@splunk/react-ui/Select";
import WaitSpinner from "@splunk/react-ui/WaitSpinner";
import React, { useMemo } from "react";
import Mapper from "../components/Mapper";
import { keyContent, useApi } from "../shared/hooks";

const ENDPOINT = "services/authorization/roles#";
const FILTER = ["splunk-system-role"];

export default ({ step, config }) => {
    const src = useApi(config.src, ENDPOINT, keyContent).data ?? [];
    const dst = useApi(config.dst, ENDPOINT, keyContent).data ?? [];

    const roles = useMemo(() => (src.length && dst.length ? src.filter((x) => !FILTER.includes(x) && !dst.includes(x)) : []), [src, dst]);

    return roles.length ? roles.map((role) => <Mapper key={role} type="roles" value={role} options={dst} />) : <WaitSpinner size="large" />;
};
