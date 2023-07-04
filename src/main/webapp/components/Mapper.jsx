import ControlGroup from "@splunk/react-ui/ControlGroup";
import Select from "@splunk/react-ui/Select";
import WaitSpinner from "@splunk/react-ui/WaitSpinner";
import { splunkdPath, username } from "@splunk/splunk-utils/config";
import { defaultFetchInit } from "@splunk/splunk-utils/fetch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import { makeBody } from "../shared/fetch";
import { useMaps } from "../shared/hooks";

export default ({ type, value, options }) => {
    const url = `${splunkdPath}/servicesNS/nobody/badmsc/configs/conf-msc/${type}?output_mode=json`;
    const map = useMaps()?.[type];
    const [error, setError] = useState(false);

    const mutation = useMutation(
        ([from, to]) =>
            fetch(url, {
                ...defaultFetchInit,
                method: "POST",
                body: makeBody({ [from]: to }),
            })
        /*.then(handle)
            .then(processMaps)
            .then((data) => queryClient.setQueryData(["maps"], (prev) => ({ ...prev, [type]: { ...data[type] } })))*/
    );

    useEffect(() => {
        setError(!options.includes(map?.[value]));
    }, [map]);

    const change = (e, { name, value }) => {
        setError(false);
        mutation.mutate([name, value]);
    };
    return (
        <ControlGroup label={value} labelWidth={300} error={mutation.isError} help={mutation.error}>
            {map ? (
                <Select defaultValue={map?.[value]} name={value} onChange={change} error={error}>
                    {options.map((x, i) => (
                        <Select.Option key={i} value={x} label={x} />
                    ))}
                </Select>
            ) : (
                <WaitSpinner size="large" />
            )}
        </ControlGroup>
    );
};
