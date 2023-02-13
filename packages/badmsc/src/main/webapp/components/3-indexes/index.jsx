import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { handle, useAcs } from '../../shared/hooks';
import { isort0, wrapSetValue } from '../../shared/helpers';
import { makeBody } from '../../shared/fetch';

// Splunk UI
import Heading from '@splunk/react-ui/Heading';
import P from '@splunk/react-ui/Paragraph';
import Text from '@splunk/react-ui/Text';
import ControlGroup from '@splunk/react-ui/ControlGroup';
import Button from '@splunk/react-ui/Button';
import Table from '@splunk/react-ui/Table';
import Check from '@splunk/react-icons/Check';
import Clear from '@splunk/react-icons/Clear';
import Events from '@splunk/react-icons/Events';
import Metrics from '@splunk/react-icons/Metrics';
import Number from '@splunk/react-ui/Number';
import Switch from '@splunk/react-ui/Switch';
import WaitSpinner from '@splunk/react-ui/WaitSpinner';
import { splunkdPath } from '@splunk/splunk-utils/config';
import { defaultFetchInit } from '@splunk/splunk-utils/fetch';

export default ({ setStep }) => {
    const queryClient = useQueryClient();

    const [create, setCreate] = useState(100);
    const [history, setHistory] = useState(90);
    const handleHistory = wrapSetValue(setHistory);
    const [searchable, setSearchable] = useState(90);
    const handleSearchable = wrapSetValue(setSearchable);
    const [enablearchive, setEnableArchive] = useState(false);
    const [archive, setArchive] = useState(365);
    const handleArchive = wrapSetValue(setArchive);

    const cloud_indexes = useAcs('indexes');
    const local_event_indexes = useQuery({
        queryKey: ['src', 'search', 'tstats', history],
        queryFn: () =>
            fetch(`${splunkdPath}/services/badmsc/proxy?to=src&uri=services/search/jobs`, {
                ...defaultFetchInit,
                method: 'POST',
                body: makeBody({
                    search: '| tstats count where index=* by index',
                    earliest_time: `-${history}d`,
                    latest_time: 'now',
                    output_mode: 'json',
                    exec_mode: 'oneshot',
                }),
            })
                .then(handle)
                .then((data) => data.results),
        staleTime: Infinity,
    });

    const local_metric_indexes = useQuery({
        queryKey: ['src', 'search', 'mstats', history],
        queryFn: () =>
            fetch(`${splunkdPath}/services/badmsc/proxy?to=src&uri=services/search/jobs`, {
                ...defaultFetchInit,
                method: 'POST',
                body: makeBody({
                    search: '| mstats count(*) where index=* by index | untable index metric count | stats sum(count) as count by index',
                    earliest_time: `-${history}d`,
                    latest_time: 'now',
                    output_mode: 'json',
                    exec_mode: 'oneshot',
                }),
            })
                .then(handle)
                .then((data) => data.results),
        staleTime: Infinity,
    });

    const handleCreate = () => {
        setCreate(0);
        const base = { SearchableDays: searchable, MaxDataSizeMB: 0 };
        if (enablearchive) base.SplunkArchivalRetentionDays = archive;

        const list = indexes
            .filter((i) => i[1].local && !i[1].cloud)
            .map((i) => ({ name: i[0], Datatype: i[1].local.datatype, ...base }));
        console.log(list);

        let chain = Promise.resolve();
        let count = 0;

        list.forEach((body) =>
            chain.then(() =>
                fetch(`${splunkdPath}/services/badmsc/proxy?to=acs&uri=adminconfig/v2/indexes`, {
                    ...defaultFetchInit,
                    method: 'POST',
                    body: JSON.stringify(body),
                }).then((res) => {
                    count++;
                    setCreate(Math.round((count / list.length) * 100));
                    if (!res.ok) return console.warn(res.json());
                })
            )
        );
        chain.then(() => {
            queryClient.invalidateQueries({
                queryKey: ['acs', 'indexes'],
            });
            setCreate(100);
        });
    };

    const indexes = useMemo(() => {
        if (!local_event_indexes.data || !local_metric_indexes.data || !cloud_indexes.data)
            return [];

        let output = {};

        output = (local_event_indexes.data || []).reduce((output, i) => {
            output[i.index] = { local: { count: i.count, datatype: 'event' }, cloud: false };
            return output;
        }, output);

        output = (local_metric_indexes.data || []).reduce((output, i) => {
            output[i.index] = { local: { count: i.count, datatype: 'metric' }, cloud: false };
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
        <div>
            <Heading level={1}>Step 3 - Indexes</Heading>
            <P>All indexes that are in use locally should be created in Splunk Cloud.</P>
            <Heading level={2}>Step 3.1 - Review Indexes</Heading>
            <ControlGroup label="Historical Search Days" labelWidth={150}>
                <Number value={history} onChange={handleHistory} min={1} max={3650} />
            </ControlGroup>
            {local_event_indexes.isLoading ||
            local_metric_indexes.isLoading ||
            cloud_indexes.isLoading ? (
                <WaitSpinner size="large" />
            ) : (
                <Table stripeRows>
                    <Table.Head>
                        <Table.HeadCell>Index Name</Table.HeadCell>

                        <Table.HeadCell>Local</Table.HeadCell>
                        <Table.HeadCell>Cloud</Table.HeadCell>
                        <Table.HeadCell>Action</Table.HeadCell>
                        <Table.HeadCell>Local Event/Metric Count</Table.HeadCell>
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

                                <Table.Cell>
                                    {local && !cloud ? (
                                        <b>Create</b>
                                    ) : !local && cloud ? (
                                        <i>Skip</i>
                                    ) : (
                                        <i>Skip</i>
                                    )}
                                </Table.Cell>
                                <Table.Cell>{local?.count}</Table.Cell>
                                <Table.Cell>{cloud?.searchableDays}</Table.Cell>
                                <Table.Cell>{cloud?.SplunkArchivalRetentionDays}</Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table>
            )}
            <Heading level={2}>Step 3.2 - Create Indexes</Heading>
            <P>
                By default, Splunk Cloud comes with 90 days of searchable storage. If you have
                purchased additional storage you can adjust the searchable and archive retention
                days that will be used when creating the missing indexes. When you are ready, click
                the button to create all missing indexes. You can customise settings per index using
                the Splunk Cloud Web UI after they are created.
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
                >
                    Enabled
                </Switch>
                <Number
                    disabled={!enablearchive}
                    value={archive}
                    onChange={handleArchive}
                    min={searchable}
                    max={3650}
                />
            </ControlGroup>
            <ControlGroup label="" labelWidth={260}>
                <Button disabled={!indexes.length || create < 100} onClick={handleCreate}>
                    {create < 100 ? `${create}% Done` : 'Create Missing Indexes'}
                </Button>
            </ControlGroup>
        </div>
    );
};
