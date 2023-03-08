import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSrc, useApi, useAuth, REQUEST_URL, FETCH_INIT } from '../shared/hooks';
import { isort0, wrapSetValue } from '../shared/helpers';
import { makeBody } from '../shared/fetch';

// Splunk UI
import Heading from '@splunk/react-ui/Heading';
import P from '@splunk/react-ui/Paragraph';
import Text from '@splunk/react-ui/Text';
import List from '@splunk/react-ui/List';
import ControlGroup from '@splunk/react-ui/ControlGroup';
import Button from '@splunk/react-ui/Button';
import Table from '@splunk/react-ui/Table';
import Link from '@splunk/react-ui/Link';

import WaitSpinner from '@splunk/react-ui/WaitSpinner';
import { splunkdPath } from '@splunk/splunk-utils/config';
import { defaultFetchInit } from '@splunk/splunk-utils/fetch';

const IGNORED_APPS = [
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
    'search_artifacts_helper',
    'splunk_ingest_actions',
    'splunkclouduf',
    'tos',
];

const splunkbaseToken = /<id>([^<]+)/;

export default ({ step }) => {
    const [username, setUsername] = useState('');
    const handleUsername = wrapSetValue(setUsername);
    const [password, setPassword] = useState('');
    const handlePassword = wrapSetValue(setPassword);
    const [token, setToken] = useState('');

    const auth = useAuth();

    const login = useMutation({
        mutationFn: () =>
            fetch(
                `${splunkdPath}/services/badmsc/proxy?${new URLSearchParams({
                    to: 'app',
                    uri: `account:login`,
                })}`,
                {
                    ...defaultFetchInit,
                    method: 'POST',
                    body: makeBody({ username, password }),
                }
            )
                .then((res) => (res.ok ? res.text() : Promise.reject()))
                .then((text) => setToken(splunkbaseToken.exec(text)[1])),
    });

    const src = useSrc('services/apps/local');
    const dst = useApi('services/apps/local');
    const splunkbase = useQuery({
        queryKey: ['splunkbase'],
        queryFn: () =>
            Promise.all(
                src.data
                    ? src.data.map((app) =>
                          fetch(
                              `${splunkdPath}/services/badmsc/proxy?${new URLSearchParams({
                                  to: 'app',
                                  uri: `v1/app/?include=releases&appid=${app.name}`,
                              })}`,
                              defaultFetchInit
                          )
                              .then((res) => (res.ok ? res.json() : Promise.reject(res.json())))
                              .then((data) =>
                                  data.total
                                      ? {
                                            uid: data.results[0].uid,
                                            appid: data.results[0].appid,
                                            title: data.results[0].title,
                                            version: data.results[0].releases.find((release) =>
                                                release.product_compatibility.includes(
                                                    'Splunk Cloud'
                                                )
                                            )?.title,
                                            license: data.results[0].license_name,
                                            license_url: data.results[0].license_url,
                                        }
                                      : false
                              )
                      )
                    : []
            ).then((apps) =>
                apps.reduce((x, app) => {
                    if (app) x[app.appid] = app;
                    return x;
                }, {})
            ),
        staleTime: Infinity,
        enabled: !!src.data,
    });

    const dstApps = useMemo(
        () =>
            dst.data
                ? dst.data.reduce((x, app) => {
                      x[app.name] = app;
                      return x;
                  }, {})
                : {},
        [dst.data]
    );

    const apps = useMemo(() => {
        const output = { done: [], splunkbase: [], private: [], unsupported: [] };
        if (!dst.data || !src.data || !splunkbase.data) return output;

        (src.data || []).forEach((a) => {
            if (dstApps[a.name]) {
                // App already exist in cloud
                console.log(`Skipping existing app '${a.name}'`);
                output.done.push({ name: a.name });
                return;
            }
            if (!a.content.details || !splunkbase.data[a.name]) {
                // Non-splunkbase apps
                if (a.content.core) {
                    console.log(`Skipping core app '${a.name}'`);
                } else if (IGNORED_APPS.includes(a.name)) {
                    console.log(`Skipping ignored app '${a.name}'`);
                } else {
                    output.private.push({ name: a.name, local: a.content });
                }
                return;
            }
            if (splunkbase.data[a.name].version) {
                // Splunkbase apps that support Splunk Cloud
                output.splunkbase.push({
                    name: a.name,
                    local: a.content,
                    splunkbase: splunkbase.data[a.name],
                });
            } else {
                // Unsupported Splunkbase apps
                output.unsupported.push({
                    name: a.name,
                    local: a.content,
                    splunkbase: splunkbase.data[a.name],
                });
            }
        });
        return output;
    }, [dst.data, src.data, splunkbase.data]);

    return (
        <div>
            <P>Install Splunkbase Apps or migrate .</P>
            <Heading level={2}>Step {step}.1 - Splunkbase Login</Heading>
            <P>
                To automatically install Splunkbase apps, a Splunk.com login is required. This will
                not be stored and only used during this session.
            </P>
            <ControlGroup label="Username">
                <Text
                    type="username"
                    autocomplete="username"
                    onChange={handleUsername}
                    value={username}
                    required
                ></Text>
            </ControlGroup>
            <ControlGroup label="Password">
                <Text
                    type="password"
                    autocomplete="current-password"
                    onChange={handlePassword}
                    value={password}
                    required
                ></Text>
            </ControlGroup>
            <ControlGroup label="" error={login.isError} help={login.error}>
                <Button
                    disabled={!username || !password}
                    onClick={login.mutate}
                    appearance={token ? 'primary' : 'default'}
                    error={login.isError}
                    label={login.isLoading ? <WaitSpinner /> : 'Login'}
                />
            </ControlGroup>
            {token}
            <Heading level={2}>Step {step}.2 - Splunkbase Apps</Heading>
            <P>
                These apps can be installed into Splunk Cloud from Splunkbase. The Splunk Cloud
                compatible version is shown.
            </P>
            {apps ? (
                <Table stripeRows>
                    <Table.Head>
                        <Table.HeadCell>App Name</Table.HeadCell>
                        <Table.HeadCell>Local Version</Table.HeadCell>
                        <Table.HeadCell>Compatible Version</Table.HeadCell>
                        <Table.HeadCell>License</Table.HeadCell>
                        <Table.HeadCell>Action</Table.HeadCell>
                    </Table.Head>
                    <Table.Body>
                        {apps.splunkbase.map(({ name, local, splunkbase }) => (
                            <Table.Row key={name}>
                                <Table.Cell>{name}</Table.Cell>
                                <Table.Cell>{local.version}</Table.Cell>
                                <Table.Cell>{splunkbase.version}</Table.Cell>
                                <Table.Cell>
                                    <Link to={splunkbase.license_url} openInNewContext>
                                        {splunkbase.license}
                                    </Link>
                                </Table.Cell>
                                <Table.Cell>
                                    <InstallSplunkbase
                                        id={splunkbase.uid}
                                        token={token}
                                        license={splunkbase.license_url}
                                    />
                                </Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table>
            ) : (
                <WaitSpinner size="large" />
            )}
            <Heading level={2}>Step {step}.3 - Private Apps</Heading>
            <P>
                These apps do not exist in Splunkbase so will need to be installed as private apps.
                Any configuration in their local directory will not be included in this step.
            </P>
            {apps ? (
                <Table stripeRows>
                    <Table.Head>
                        <Table.HeadCell>App Name</Table.HeadCell>
                        <Table.HeadCell>Results</Table.HeadCell>
                        <Table.HeadCell>Action</Table.HeadCell>
                    </Table.Head>
                    <Table.Body>
                        {apps.private.map(({ name, local }) => (
                            <Table.Row key={name}>
                                <Table.Cell>{name}</Table.Cell>
                                <Table.Cell>Results</Table.Cell>
                                <Table.Cell>Action</Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table>
            ) : (
                <WaitSpinner size="large" />
            )}
            <Heading level={2}>Step {step}.4 - Unsupported Splunkbase Apps</Heading>
            <P>
                These apps do not have a version avaliable on Splunkbase which has been vetted for
                Splunk Cloud.
            </P>
            <List>
                {apps.unsupported.map(({ name, local, splunkbase }) => (
                    <List.Item key={name}>
                        <Link
                            to={`https://splunkbase.splunk.com/app/${splunkbase.uid}`}
                            openInNewContext
                        >
                            {name}
                        </Link>
                    </List.Item>
                ))}
            </List>
            <Heading level={2}>Step {step}.5 - Matching Apps</Heading>
            <P>These apps already exist in the Splunk Cloud instance.</P>
            <List>
                {apps.done.length ? (
                    apps.done.map(({ name }) => <List.Item key={name}>{name}</List.Item>)
                ) : (
                    <List.Item>There are no matching apps</List.Item>
                )}
            </List>
        </div>
    );
};

const InstallSplunkbase = ({ id, token, license }) => {
    const queryClient = useQueryClient();
    const auth = useAuth();
    const install = useMutation({
        mutationFn: () =>
            fetch(REQUEST_URL, {
                ...FETCH_INIT,
                body: JSON.stringify({
                    url: `https://${auth.data.acs}/adminconfig/v2/apps/victoria`,
                    method: 'POST',
                    params: { splunkbase: 'true' },
                    headers: {
                        Authorization: `Bearer ${auth.data.token}`,
                        'X-Splunkbase-Authorization': token,
                        'ACS-Licensing-Ack': license,
                    },
                    data: { splunkbaseID: id },
                }),
            }).then((res) =>
                res.status === 202
                    ? queryClient.setQueryData(['api', 'services/apps/local'],
                      (prev)=>{
                        return {
                          ...prev,
                          apps: [...prev.apps, {name: id, installed: true}]
                        }
                      })
                    : Promise.reject()
            ),
    });
    return (
        <Button
            appearance={
                (install.isSuccess && 'primary') || install.isLoading && "pill" || (install.isError && 'destructive') || 'default'
            }
            onClick={install.mutate}
            disabled={!token || install.isLoading || install.isSuccess || !auth.data}
        >
            {(install.isSuccess && 'Installed') || install.isLoading && <WaitSpinner/> || (install.isError && 'Error') || 'Install'}
        </Button>
    );
};
