import ControlGroup from "@splunk/react-ui/ControlGroup";
import Date from "@splunk/react-ui/Date";
import Heading from "@splunk/react-ui/Heading";
import Multiselect from "@splunk/react-ui/Multiselect";
import Number from "@splunk/react-ui/Number";
import P from "@splunk/react-ui/Paragraph";
import Table from "@splunk/react-ui/Table";
import Text from "@splunk/react-ui/Text";
import { splunkdPath } from "@splunk/splunk-utils/config";
import { useMutation } from "@tanstack/react-query";
import moment from "moment";
import React, { useEffect, useState } from "react";
import MutateButton from "../components/MutateButton";
import { FETCH_INIT, request } from "../shared/fetch";
import { wrapSetValue, wrapSetValues } from "../shared/helpers";
import { handle, useApi, useConfig, useLocal } from "../shared/hooks";

export default () => {
    const config = useConfig();
    const [earliest, setEarliest] = useState(360);
    const handleEarliest = wrapSetValue(setEarliest);

    const dst_indexes = useApi(config.dst, "services/data/indexes", (data) =>
        data.entry.filter((index) => index.content.datatype == "event" && !index.name.startsWith("_")).map((index) => index.name)
    );

    const createInputs = useMutation(() =>
        request({
            url: `${config.src.api}/services/search/jobs`,
            method: "POST",
            data: {
                search: `| tstats count where index IN (${dst_indexes.data.join(",")}) by index _time span=1d`,
                earliest_time: `-${earliest}d`,
                latest_time: "now",
                output_mode: "json",
                exec_mode: "oneshot",
                time_format: "%s",
                count: 0,
            },
            headers: {
                Authorization: `Bearer ${config.src.token}`,
            },
        })
            .then(handle)
            .then((data) => {
                const plan = {};
                data.results.forEach(({ index, _time, count }) => {
                    count = parseInt(count);
                    _time = parseInt(_time);
                    if (!plan[index]) {
                        plan[index] = {
                            index,
                            total: 0,
                            progress: 0,
                            tasks: [],
                            running: false,
                            done: [],
                        };
                    }
                    plan[index].tasks.push([_time, count]);
                    plan[index].total += count;
                });
                setPlan(Object.values(plan));
            })
    );

    return (
        <div>
            <P>
                User (private) knowledge objects can be transferred as long as the user exists in Splunk Cloud. If you are using SSO then this requires them to
                have logged in once.
            </P>
            <Heading level={2}>Modular Input</Heading>
            <ControlGroup label="Backfill days">
                <Number value={earliest} onChange={handleEarliest} />
            </ControlGroup>
            <ControlGroup label=" ">
                <MutateButton mutation={createInputs} label="Create Inputs" disabled={!dst_indexes.data} />
            </ControlGroup>
        </div>
    );
};
