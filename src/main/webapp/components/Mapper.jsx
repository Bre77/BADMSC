import ControlGroup from "@splunk/react-ui/ControlGroup";
import Select from "@splunk/react-ui/Select";
import { splunkdPath, username } from "@splunk/splunk-utils/config";
import { defaultFetchInit } from "@splunk/splunk-utils/fetch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { makeBody } from "../shared/fetch";

const FILTER = ["eai:acl", "eai:appName", "eai:userName", "disabled"];
const handleMap = (res) => {
    if (res.status == 404) return {};
    if (!res.ok) return res.text().then(Promise.reject);
    return res.json().then((data) => Object.fromEntries(Object.entries(data.entry[0].content).filter(([k]) => !FILTER.includes(k))));
};

export default ({ type, value, options, fallback }) => {
    const url = `${splunkdPath}/servicesNS/${username}/badmsc/configs/conf-msc/${type}?output_mode=json`;
    const queryClient = useQueryClient();
    const map =
        useQuery({
            queryKey: ["map", type],
            queryFn: ({ signal }) => fetch(url, { ...defaultFetchInit, signal }).then(handleMap),
        }).data || {};

    const mutation = useMutation(([from, to]) =>
        fetch(url, {
            ...defaultFetchInit,
            method: "POST",
            body: makeBody({ [from]: to }),
        })
            .then(handleMap)
            .then((data) => queryClient.setQueryData(["map", type], data))
    );

    const change = (e, { name, value }) => {
        mutation.mutate([name, value]);
    };
    return (
        <ControlGroup key={value} label={value} labelWidth={300}>
            <Select value={map[value] || fallback} name={value} onChange={change} error={mutation.isError}>
                <Select.Option key={fallback} value={fallback} label={fallback} />
                {options.map((x) => (
                    <Select.Option key={x} value={x} label={x} />
                ))}
            </Select>
        </ControlGroup>
    );
};
