//! Add exclusion select

import Check from "@splunk/react-icons/Check";
import Clear from "@splunk/react-icons/Clear";
import Events from "@splunk/react-icons/Events";
import Metrics from "@splunk/react-icons/Metrics";
import Button from "@splunk/react-ui/Button";
import ControlGroup from "@splunk/react-ui/ControlGroup";
import Heading from "@splunk/react-ui/Heading";
import Number from "@splunk/react-ui/Number";
import P from "@splunk/react-ui/Paragraph";
import Switch from "@splunk/react-ui/Switch";
import Table from "@splunk/react-ui/Table";
import WaitSpinner from "@splunk/react-ui/WaitSpinner";
import { useCallback, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useContext, useMemo, useState } from "react";
import Header from "../components/Header";
import { request } from "../shared/fetch";
import { isort0, wrapSetValue } from "../shared/helpers";
import { handle, useAcs, useConfig, useDebounce } from "../shared/hooks";
import { Config, Page } from "../shared/page";

const Root = () => {
    const config = useConfig();
    const queryClient = useQueryClient();

    // Refresh critical data for this step
    useMemo(() => {
        queryClient.invalidateQueries({
            queryKey: ["acs", "indexes"],
        });
    }, []);

    const [create, setCreate] = useState(100);
    const [history, setHistory] = useState(30);
    const handleHistory = wrapSetValue(setHistory);
    const debouncedhistory = useDebounce(history, 500);
    const [searchable, setSearchable] = useState(90);
    const handleSearchable = wrapSetValue(setSearchable);
    const [enablearchive, setEnableArchive] = useState(false);
    const [archive, setArchive] = useState(365);
    const handleArchive = wrapSetValue(setArchive);

    const cloud_indexes = useAcs(config.dst, "indexes");
    const local_event_indexes = useQuery({
        queryKey: ["src", "search", "tstats", debouncedhistory],
        queryFn: ({ signal }) =>
            request(
                {
                    url: `${config.src.api}/services/search/jobs`,
                    method: "POST",
                    data: {
                        search: "| tstats count where index=* by index",
                        earliest_time: `-${debouncedhistory}d`,
                        latest_time: "now",
                        output_mode: "json",
                        exec_mode: "oneshot",
                        count: 0,
                    },
                    headers: {
                        Authorization: `Bearer ${config.src.token}`,
                    },
                },
                signal
            )
                .then(handle)
                .then((data) => data.results),
    });

    const local_metric_indexes = useQuery({
        queryKey: ["src", "search", "mstats", debouncedhistory],
        queryFn: ({ signal }) =>
            request(
                {
                    url: `${config.src.api}/services/search/jobs`,
                    method: "POST",
                    data: {
                        search: "| mstats count(*) where index=* by index | untable index metric count | stats sum(count) as count by index",
                        earliest_time: `-${debouncedhistory}d`,
                        latest_time: "now",
                        output_mode: "json",
                        exec_mode: "oneshot",
                        count: 0,
                    },
                    headers: {
                        Authorization: `Bearer ${config.src.token}`,
                    },
                },
                signal
            )
                .then(handle)
                .then((data) => data.results),
    });

    const handleCreate = () => {
        setCreate(0);
        const base = { SearchableDays: searchable, MaxDataSizeMB: 0 };
        if (enablearchive) base.SplunkArchivalRetentionDays = archive;

        const list = indexes.filter((i) => i[1].local && !i[1].cloud).map((i) => ({ name: i[0], Datatype: i[1].local.datatype, ...base }));
        console.log(list);

        let count = 0;

        list.reduce(
            (chain, json) =>
                chain.then(() =>
                    request({
                        url: `${config.dst.acs}/adminconfig/v2/indexes`,
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${config.dst.token}`,
                        },
                        json,
                    }).then((res) => {
                        count++;
                        if (!res.ok) console.warn(res.json());
                        setCreate(Math.round((count / list.length) * 100));
                    })
                ),
            Promise.resolve()
        ).then(() => {
            queryClient.invalidateQueries({
                queryKey: ["acs", "indexes"],
            });
            setCreate(100);
        });
    };

    const indexes = useMemo(() => {
        if (!local_event_indexes.data || !local_metric_indexes.data || !cloud_indexes.data) return [];

        let output = {};

        output = (local_event_indexes.data || []).reduce((output, i) => {
            output[i.index] = { local: { count: i.count, datatype: "event" }, cloud: false };
            return output;
        }, output);

        output = (local_metric_indexes.data || []).reduce((output, i) => {
            output[i.index] = { local: { count: i.count, datatype: "metric" }, cloud: false };
            return output;
        }, output);

        output = (cloud_indexes.data || []).reduce((output, i) => {
            if (!output[i.name]) output[i.name] = { local: false, cloud: i };
            else output[i.name].cloud = i;
            return output;
        }, output);

        return Object.entries(output).sort(isort0);
    }, [cloud_indexes.data, local_event_indexes.data, local_metric_indexes.data]);

    const type = { event: <Events />, metric: <Metrics /> };

    return (
        <>
            <Header title="Indexes" prev="ipallow" next="apps" />
            <P>All indexes that are in use locally should be created in Splunk Cloud.</P>
            <Heading level={2}>Review Indexes</Heading>
            <ControlGroup label="Historical Search Days" labelWidth={150}>
                <Number value={history} onChange={handleHistory} min={1} max={3650} />
            </ControlGroup>
            {local_event_indexes.isFetching || local_metric_indexes.isFetching || cloud_indexes.isFetching ? (
                <WaitSpinner size="large" />
            ) : (
                <Table stripeRows>
                    <Table.Head>
                        <Table.HeadCell>Index Name</Table.HeadCell>

                        <Table.HeadCell>Local</Table.HeadCell>
                        <Table.HeadCell>Cloud</Table.HeadCell>
                        <Table.HeadCell>Action</Table.HeadCell>
                        <Table.HeadCell>Cloud Searchable Days</Table.HeadCell>
                        <Table.HeadCell>Cloud Archive Days</Table.HeadCell>
                    </Table.Head>
                    <Table.Body>
                        {indexes.map(([index, { local, cloud }]) => (
                            <Table.Row key={index}>
                                <Table.Cell>
                                    {type[local?.datatype || cloud?.datatype]} {index}
                                </Table.Cell>
                                <Table.Cell>{local ? <Check /> : <Clear />}</Table.Cell>
                                <Table.Cell>{cloud ? <Check /> : <Clear />}</Table.Cell>

                                <Table.Cell>{local && !cloud ? <b>Create</b> : !local && cloud ? <i>Skip</i> : <i>Skip</i>}</Table.Cell>
                                <Table.Cell>{cloud?.searchableDays}</Table.Cell>
                                <Table.Cell>{cloud?.SplunkArchivalRetentionDays}</Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table>
            )}
            <Heading level={2}>Create Indexes</Heading>
            <P>
                By default, Splunk Cloud comes with 90 days of searchable storage. If you have purchased additional storage you can adjust the searchable and
                archive retention days that will be used when creating the missing indexes. When you are ready, click the button to create all missing indexes.
                You can customise settings per index using the Splunk Cloud Web UI after they are created.
            </P>
            <ControlGroup label="Searchable Retention (DDAS) Days" labelWidth={260}>
                <Number value={searchable} onChange={handleSearchable} min={1} max={3650} />
            </ControlGroup>
            <ControlGroup label="Archive Retention (DDAA) Days" labelWidth={260}>
                <Switch
                    appearance="toggle"
                    selected={enablearchive}
                    onClick={() => {
                        setEnableArchive(!enablearchive);
                    }}
                />
                <Number disabled={!enablearchive} value={archive} onChange={handleArchive} min={searchable} max={3650} />
            </ControlGroup>
            <ControlGroup label="" labelWidth={260}>
                <Button disabled={!indexes.length || create < 100} onClick={handleCreate}>
                    {create < 100 ? `${create}% Done` : "Create Missing Indexes"}
                </Button>
            </ControlGroup>
        </>
    );
};

Page(<Root />);
