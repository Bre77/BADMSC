import ControlGroup from "@splunk/react-ui/ControlGroup";
import Heading from "@splunk/react-ui/Heading";
import Select from "@splunk/react-ui/Select";
import WaitSpinner from "@splunk/react-ui/WaitSpinner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useMemo } from "react";
import Map from "../components/Map";
import MutateButton from "../components/MutateButton";
import { request } from "../shared/fetch";
import { keyContent, useApi, useConfig, useMap } from "../shared/hooks";

const ENDPOINT = "services/authentication/users";
const DEFAULT = "nobody";

export default ({ step, config }) => {
    const queryClient = useQueryClient();
    const src = useApi(config.src, ENDPOINT, keyContent).data || [];
    const dst = useApi(config.dst, ENDPOINT, keyContent).data || [];
    const map = useMap("users") || {};

    const options = useMemo(() => dst.map((x) => <Select.Option key={x} value={x} label={x} />), [dst]);
    const users = useMemo(() => src.filter((x) => !dst.includes(x)), [src, dst]);

    return users.length ? (
        users.map((user) => (
            <ControlGroup key={user} label={user} labelWidth={300}>
                <Select value={map[user] || DEFAULT} onChange={() => {}}>
                    <Select.Option key={DEFAULT} value={DEFAULT} label={DEFAULT} />
                    {options}
                </Select>
            </ControlGroup>
        ))
    ) : (
        <WaitSpinner size="large" />
    );
};
