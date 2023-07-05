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
import React, { useContext, useEffect, useState } from "react";
import Header from "../components/Header";
import MutateButton from "../components/MutateButton";
import { FETCH_INIT, request } from "../shared/fetch";
import { wrapSetValue, wrapSetValues } from "../shared/helpers";
import { handle, useApi, useLocal } from "../shared/hooks";
import { Config, Page } from "../shared/page";

const Root = () => {
    const config = useContext(Config);
    const [indexes, setIndexes] = useState([]);
    const handleIndexes = wrapSetValues(setIndexes);
    const [earliest, setEarliest] = useState(moment().add(-90, "day").format("YYYY-MM-DD"));
    const handleEarliest = wrapSetValue(setEarliest);
    const [latest, setLatest] = useState(moment().format("YYYY-MM-DD"));
    const handleLatest = wrapSetValue(setLatest);
    const [plan, setPlan] = useLocal("badmsc_migration_plan", []);
    const [concurrency, setConcurrency] = useState(2);
    const handleConcurrency = wrapSetValue(setConcurrency);
    const [token, setToken] = useState("77d5ceac-229c-42ea-96b1-e6dd13adcf45");
    const handleToken = wrapSetValue(setToken);

    const src_indexes = useApi(config.src, "services/data/indexes", (data) =>
        data.entry.filter((index) => index.content.datatype == "event").map((index) => index.name)
    );

    useEffect(() => {
        if (indexes.length == 0 && src_indexes.data) {
            console.log("Adding Indexes", src_indexes.data);
            setIndexes(src_indexes.data.filter((index) => !index.startsWith("_")));
        }
    }, [src_indexes.data]);

    const calculatePlan = useMutation(() =>
        request({
            url: `${config.src.api}/services/search/jobs`,
            method: "POST",
            data: {
                search: `| tstats count where index IN (${indexes.join(",")}) by index _time span=1d`,
                earliest_time: moment(earliest).unix(),
                latest_time: moment(latest).add(1, "day").unix(),
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
                        plan[index] = { index, total: 0, progress: 0, tasks: [], running: false, done: [] };
                    }
                    plan[index].tasks.push([_time, count]);
                    plan[index].total += count;
                });
                setPlan(Object.values(plan));
            })
    );

    const createToken = useMutation(() => {});

    const migrateData = useMutation(() => {
        plan.reduce(
            (chain, { index, tasks }) =>
                tasks.reduce(
                    (chain, [earliest, count]) =>
                        chain.then(() =>
                            fetch(`${splunkdPath}/services/badmsc/data`, {
                                ...FETCH_INIT,
                                body: JSON.stringify({
                                    src_api: config.src.api,
                                    src_token: config.src.token,
                                    dest_hec: config.dst.hec,
                                    dest_token: token,
                                    index,
                                    earliest,
                                    latest: earliest + 86400,
                                }),
                            })
                        ),
                    chain
                ),
            Promise.resolve()
        );
    });

    return (
        <>
            <Header title="Data" prev="kv" next="asbuilt" />
            <P>
                User (private) knowledge objects can be transferred as long as the user exists in Splunk Cloud. If you are using SSO then this requires them to
                have logged in once.
            </P>
            <Heading level={2}>Option {step}.1 - Dual Forwarding</Heading>
            <Heading level={2}>Option {step}.2 - _raw Event Copy</Heading>
            <ControlGroup label="Earliest & Latest">
                <Date highlightToday value={earliest} onChange={handleEarliest} disabled={migrateData.isLoading} />
                <Date highlightToday value={latest} onChange={handleLatest} disabled={migrateData.isLoading} />
            </ControlGroup>

            <ControlGroup label="Indexes">
                <Multiselect values={indexes} onChange={handleIndexes} isLoadingOptions={src_indexes.isLoading}>
                    {src_indexes.data?.map((index) => (
                        <Multiselect.Option key={index} value={index} label={index} />
                    ))}
                </Multiselect>
            </ControlGroup>
            <ControlGroup label=" ">
                <MutateButton mutation={calculatePlan} label="Create New Migration Plan" disabled={migrateData.isLoading || !indexes.length} />
            </ControlGroup>
            <ControlGroup label="HEC Token">
                <Text value={token} onChange={handleToken} />
                <MutateButton mutation={createToken} label="Create Token" />
            </ControlGroup>
            <ControlGroup label="Concurrency">
                <Number value={concurrency} onChange={handleConcurrency} min={1} max={32} />
                <MutateButton mutation={migrateData} label="Start Migration" disabled={!token} />
            </ControlGroup>

            <Table>
                <Table.Head>
                    <Table.HeadCell>Index</Table.HeadCell>
                    <Table.HeadCell>Events</Table.HeadCell>
                    <Table.HeadCell>Progress</Table.HeadCell>
                </Table.Head>
                <Table.Body>
                    {plan.map(({ index, total, tasks }) => (
                        <Table.Row key={index}>
                            <Table.Cell>{index}</Table.Cell>
                            <Table.Cell>{total}</Table.Cell>
                            <Table.Cell>{total}</Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table>
        </>
    );
};

Page(<Root />);
