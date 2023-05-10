import ControlGroup from "@splunk/react-ui/ControlGroup";
import Date from "@splunk/react-ui/Date";
import Heading from "@splunk/react-ui/Heading";
import Number from "@splunk/react-ui/Number";
import P from "@splunk/react-ui/Paragraph";
import Table from "@splunk/react-ui/Table";
import Text from "@splunk/react-ui/Text";
import { useMutation } from "@tanstack/react-query";
import moment from "moment";
import React, { useState } from "react";
import MutateButton from "../components/mutateButton";
import { request } from "../shared/fetch";
import { wrapSetValue } from "../shared/helpers";
import { handle, useLocal } from "../shared/hooks";

export default ({ step, config }) => {
    const [search, setSearch] = useState("index = *");
    const handleSearch = wrapSetValue(setSearch);
    const [earliest, setEarliest] = useState(moment().add(-90, "day").format("YYYY-MM-DD"));
    const handleEarliest = wrapSetValue(setEarliest);
    const [latest, setLatest] = useState(moment().format("YYYY-MM-DD"));
    const handleLatest = wrapSetValue(setLatest);
    const [plan, setPlan] = useLocal("badmsc_migration_plan", false);

    const summary = useMutation(() =>
        request({
            url: `${config.src.api}/services/search/jobs`,
            method: "POST",
            params: { output_mode: "json", count: -1 },
            data: {
                search: `| tstats count where ${search} by index _time span=1d | xyseries index _time count`,
                earliest_time: moment(earliest).unix(),
                latest_time: moment(latest).add(1, "day").unix(),
                output_mode: "json",
                exec_mode: "oneshot",
                count: 0,
            },
            headers: {
                Authorization: `Bearer ${config.src.token}`,
            },
        })
            .then(handle)
            .then((data) => setPlan(data.results))
    );
    return (
        <div>
            <P>
                User (private) knowledge objects can be transferred as long as the user exists in Splunk Cloud. If you are using SSO then this requires them to
                have logged in once.
            </P>
            <Heading level={2}>Step {step} Option 1 - Dual Forwarding</Heading>
            <Heading level={2}>Step {step} Option 2 - _raw Event Copy</Heading>
            <ControlGroup label="Earliest">
                <Date highlightToday value={earliest} onChange={handleEarliest} />
            </ControlGroup>
            <ControlGroup label="Latest">
                <Date highlightToday value={latest} onChange={handleLatest} />
            </ControlGroup>
            <ControlGroup label="Search">
                <Text value={search} onChange={handleSearch} /> Hours
            </ControlGroup>
            <ControlGroup label=" ">
                <MutateButton mutation={summary} label="Create New Migration Plan" />
            </ControlGroup>
            {plan && JSON.stringify(plan)}
        </div>
    );
};
