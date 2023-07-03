import ControlGroup from "@splunk/react-ui/ControlGroup";
import Select from "@splunk/react-ui/Select";
import { splunkdPath, username } from "@splunk/splunk-utils/config";
import { defaultFetchInit } from "@splunk/splunk-utils/fetch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { memo } from "react";
import { MAP_BLACKLIST } from "../shared/const";
import { makeBody } from "../shared/fetch";

const handleMap = (res) => {
    if (res.status == 404) return {};
    if (!res.ok) return res.text().then(Promise.reject);
    return res.json().then((data) => Object.fromEntries(Object.entries(data.entry[0].content).filter(([k]) => !MAP_BLACKLIST.includes(k))));
};

export default memo(({ type, value, options }) => {
    const url = `${splunkdPath}/servicesNS/nobody/badmsc/configs/conf-msc/${type}?output_mode=json`;
    const queryClient = useQueryClient();
    const map =
        useQuery({
            queryKey: ["map", type],
            queryFn: ({ signal }) => fetch(url, { ...defaultFetchInit, signal }).then(handleMap),
        }).data ?? {};

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
        <ControlGroup key={value} label={value} labelWidth={300} error={mutation.isError} help={mutation.error}>
            <Select value={map[value]} name={value} onChange={change} error={!options.includes(map[value])}>
                {options.map((x, i) => (
                    <Select.Option key={i} value={x} label={x} />
                ))}
            </Select>
        </ControlGroup>
    );
});
