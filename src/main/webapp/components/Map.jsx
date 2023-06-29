import ControlGroup from "@splunk/react-ui/ControlGroup";
import Select from "@splunk/react-ui/Select";
import WaitSpinner from "@splunk/react-ui/WaitSpinner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useMemo } from "react";
import MutateButton from "../components/MutateButton";
import { request } from "../shared/fetch";
import { keyContent, useApi, useConfig, useMap } from "../shared/hooks";

const ENDPOINTS = { users: "services/authentication/users", roles: "services/authorization/roles" };

export default ({ type }) => {
    const ENDPOINT = ENDPOINTS[type];
    const queryClient = useQueryClient();
    const config = useConfig();
    const src = useApi(config.src, ENDPOINT, keyContent);
    const dst = useApi(config.dst, ENDPOINT, keyContent);
    const map = useMap(type);

    const options = useMemo(
        () => [<Select.Option value="nobody" label="nobody" />, ...(dst.data || []).map((user) => <Select.Option key={user} value={user} label={user} />)],
        [dst.data]
    );

    return src.data ? (
        src.data.map((user) => (
            <ControlGroup label={user}>
                <Select value={map[user] || "nobody"} onChange={() => {}}>
                    {options}
                </Select>
            </ControlGroup>
        ))
    ) : (
        <WaitSpinner size="large" />
    );
};
