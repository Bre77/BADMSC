import Select from "@splunk/react-ui/Select";
import WaitSpinner from "@splunk/react-ui/WaitSpinner";
import React, { useMemo } from "react";
import Mapper from "../components/Mapper";
import { keyContent, useApi } from "../shared/hooks";

const ENDPOINT = "services/authentication/users#";
const DEFAULT = "nobody";

export default ({ step, config }) => {
    const src = useApi(config.src, ENDPOINT, keyContent).data || [];
    const dst = useApi(config.dst, ENDPOINT, keyContent).data || [];

    const users = useMemo(() => (src.length && dst.length ? src.filter((x) => !dst.includes(x)) : []), [src, dst]);

    return users.length ? users.map((user) => <Mapper type="users" fallback="nobody" key={user} value={user} options={dst} />) : <WaitSpinner size="large" />;
};
