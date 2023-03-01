import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSrc, useApi } from '../shared/hooks';
import { isort0, wrapSetValue } from '../shared/helpers';
import {} from '../shared/fetch';

// Splunk UI
import Heading from '@splunk/react-ui/Heading';
import P from '@splunk/react-ui/Paragraph';
import Text from '@splunk/react-ui/Text';
import ControlGroup from '@splunk/react-ui/ControlGroup';
import Button from '@splunk/react-ui/Button';
import Table from '@splunk/react-ui/Table';
import Check from '@splunk/react-icons/Check';
import Clear from '@splunk/react-icons/Clear';

import WaitSpinner from '@splunk/react-ui/WaitSpinner';
import { splunkdPath } from '@splunk/splunk-utils/config';
import { defaultFetchInit } from '@splunk/splunk-utils/fetch';

const DEFAULT_APPS = [
    '000-self-service',
    '075-cloudworks',
    '100-cloudworks-wlm',
    '100-whisper',
    '100-whisper-common',
    '100-whisper-searchhead',
    'alert_logevent',
    'alert_webhook',
    'appsbrowser',
    'cloud-app-readiness',
    'cloud_administration',
    'data_manager',
    'dmc',
    'dynamic-data-self-storage-app',
    'introspection_generator_addon',
    'journald_input',
    'launcher',
    'learned',
    'legacy',
    'prometheus',
    'python_upgrade_readiness_app',
    'sample_app',
    'search',
    'search_artifacts_helper',
    'splunk-dashboard-studio',
    'splunk_gdi',
    'splunk_httpinput',
    'splunk_instance_monitoring',
    'splunk_instrumentation',
    'splunk_internal_metrics',
    'splunk_metrics_workspace',
    'splunk_product_guidance',
    'splunk_rapid_diag',
    'splunk_secure_gateway',
    'splunkclouduf',
    'tos',
];

const App = ({ app, cloud, local }) => {
    const splunkbase = useQuery({
        queryKey: ['app', app],
        queryFn: () =>
            fetch(
                `${splunkdPath}/services/badmsc/proxy?${new URLSearchParams({
                    to: 'app',
                    uri: `v1/app/?include=release&appid=${app}`,
                })}`,
                defaultFetchInit
            )
                .then((res) => (res.ok ? res.json() : Promise.reject(res.json())))
                .then((data) => (data.total ? data.results[0] : false)),
        staleTime: Infinity,
        disabled: !local.details,
    });
    return (
        <Table.Row key={app}>
            <Table.Cell>{app}</Table.Cell>
            <Table.Cell>
                {local ? <Check /> : <Clear />} {local?.version && `(${local?.version})`}
            </Table.Cell>
            <Table.Cell>
                {cloud ? <Check /> : <Clear />} {cloud?.version && `(${cloud?.version})`}
            </Table.Cell>
            <Table.Cell>{splunkbase.data?.release?.title}</Table.Cell>
            <Table.Cell>
                {local && !cloud ? (
                    splunkbase.data ? (
                        <b>Splunkbase</b>
                    ) : (
                        <b>Private App</b>
                    )
                ) : !local && cloud ? (
                    <i>Ignore</i>
                ) : (
                    <i>Skip</i>
                )}
            </Table.Cell>
            <Table.Cell>{local && !cloud && <Button>Install</Button>}</Table.Cell>
        </Table.Row>
    );
};

export default ({ step }) => {
    const queryClient = useQueryClient();

    const src = useSrc('services/apps/local');
    const dst = useApi('services/apps/local');

    const apps = useMemo(() => {
        if (!dst.data || !src.data) return [];

        let output = {};

        output = (src.data || []).reduce((output, a) => {
            output[a.name] = {
                local: a.content,
                cloud: false,
            };
            return output;
        }, output);

        output = (dst.data?.apps || []).reduce((output, a) => {
            if (!output[a.name]) output[a.name] = { local: false, cloud: a };
            else output[a.name].cloud = a;
            return output;
        }, output);
        return Object.entries(output)
            .filter(([name, _]) => !DEFAULT_APPS.includes(name))
            .sort(isort0);
    }, [dst.data, src.data]);

    const count = useMemo(() => {
        return apps.reduce(
            (count, [name, app]) => {
                count[0] += app.cloud && app.local;
                count[1] += !!app.local;
                return count;
            },
            [0, 0]
        );
    }, [apps]);

    return (
        <div>
            <P>Install Splunkbase Apps or migrate .</P>
            <Heading level={2}>Step {step}.1 - Splunkbase Login</Heading>
            <P>
                To automatically install Splunkbase apps, a Splunk.com login is required. This will
                not be stored and only used during this session.
            </P>
            <ControlGroup label="Username">
                <Text></Text>
            </ControlGroup>
            <ControlGroup label="Password">
                <Text></Text>
            </ControlGroup>
            <Heading level={2}>Step {step}.2 - Splunkbase Apps</Heading>
            <P>
                Review each app in the list below and install each one as required. Any Splunkbase
                or Private apps that are not installed will not be displayed in the subsequent
                steps. <b>{count.join('/')}</b> local apps installed.
            </P>
            {dst.isLoading || src.isLoading ? (
                <WaitSpinner size="large" />
            ) : (
                <Table stripeRows>
                    <Table.Head>
                        <Table.HeadCell>App Name</Table.HeadCell>

                        <Table.HeadCell>Local (Version)</Table.HeadCell>
                        <Table.HeadCell>Cloud (Version)</Table.HeadCell>
                        <Table.HeadCell>Latest Version</Table.HeadCell>
                        <Table.HeadCell>Action</Table.HeadCell>

                        <Table.HeadCell>Action</Table.HeadCell>
                    </Table.Head>
                    <Table.Body>
                        {apps.map(([app, { local, cloud }]) => (
                            <App key={app} app={app} local={local} cloud={cloud} />
                        ))}
                    </Table.Body>
                </Table>
            )}
        </div>
    );
};
