import React, { useState, useEffect } from 'react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Splunk UI
import Heading from '@splunk/react-ui/Heading';
import P from '@splunk/react-ui/Paragraph';
import Text from '@splunk/react-ui/Text';
import ControlGroup from '@splunk/react-ui/ControlGroup';
import Link from '@splunk/react-ui/Link';
import List from '@splunk/react-ui/List';
import Button from '@splunk/react-ui/Button';
import { defaultFetchInit } from '@splunk/splunk-utils/fetch';
import { splunkdPath, username } from '@splunk/splunk-utils/config';
import Success from '@splunk/react-icons/Success';
import Error from '@splunk/react-icons/Error';
import Save from '@splunk/react-icons/Save';
import NotAllowed from '@splunk/react-icons/NotAllowed';
import Message from '@splunk/react-ui/Message';
import WaitSpinner from '@splunk/react-ui/WaitSpinner';
import Tooltip from '@splunk/react-ui/Tooltip';
import DL from '@splunk/react-ui/DefinitionList';

//Shared
import { wrapSetValue } from '../shared/helpers';

import { makeBody, request } from '../shared/fetch';
import { useAcs, useGetApi } from '../shared/hooks';

const StatusCheck = ({ host, disabled }) => {
    const { data, isLoading } = useQuery({
        queryKey: ['check', host],
        queryFn: () =>
            request({
                url: `https://${host}`,
                method: 'OPTIONS',
            }).then((res) => res.ok),
        staleTime: Infinity,
        enabled: !disabled,
    });
    if (disabled) return <NotAllowed />;
    if (isLoading) return <WaitSpinner />;
    if (data === true) return <Success />;
    return (
        <Tooltip content={data}>
            <Error />
        </Tooltip>
    );
};

const PLACEHOLDER = 'customer.splunkcloud.com';

export default ({ step, config }) => {
    const [stack, setStack] = useState(PLACEHOLDER);
    const handleStack = wrapSetValue(setStack);
    const [token, setToken] = useState('');
    const handleToken = wrapSetValue(setToken);

    if (stack.startsWith('https://')) setStack(stack.replace('https://', '').replace('/', ''));
    const web = stack;
    const api = `${stack}:8089`;
    const acs = `admin.splunk.com/${stack.replace('.splunkcloud.com', '')}`;
    const hec = `http-inputs-${stack.replace(/^(es-|itsi-)/, '')}:443`;
    const stack_valid = stack.endsWith('.splunkcloud.com') && stack !== PLACEHOLDER;

    const { data: password } = useQuery({
        queryKey: ['password'],
        queryFn: () =>
            fetch(
                `${splunkdPath}/servicesNS/${username}/badmsc/storage/passwords/badmsc%3Aauth%3A?output_mode=json&count=1`
            ).then((res) =>
                res.ok
                    ? res
                          .json()
                          .then((data) => JSON.parse(data.entry[0].content.clear_password))
                          .catch(() => ({}))
                    : false
            ),
        staleTime: Infinity,
        notifyOnChangeProps: ['data'],
    });

    useEffect(() => {
        if (config?.dst?.token) setToken(config?.dst?.token);
        if (config?.dst?.api) setStack(config?.dst?.api.split(':')[0]);
    }, [config]);

    const test = useAcs(stack_valid && { acs, token }, 'status');

    //const apiTest = useGetApi({ api, token }, 'services/admin/server-info');

    const queryClient = useQueryClient();
    const mutatePassword = useMutation({
        mutationFn: () =>
            (password
                ? fetch(
                      `${splunkdPath}/servicesNS/${username}/badmsc/storage/passwords/badmsc%3Aauth%3A?output_mode=json`,
                      {
                          ...defaultFetchInit,
                          method: 'POST',
                          body: makeBody({
                              password: JSON.stringify({
                                  token,
                                  api,
                                  acs,
                                  hec,
                                  src: { api: '', token: '' },
                                  dst: { api, token, acs, hec },
                              }),
                          }),
                      }
                  )
                : fetch(
                      `${splunkdPath}/servicesNS/${username}/badmsc/storage/passwords?output_mode=json`,
                      {
                          ...defaultFetchInit,
                          method: 'POST',
                          body: makeBody({
                              realm: 'badmsc',
                              name: 'auth',
                              password: JSON.stringify({ token, api, acs, hec }),
                          }),
                      }
                  )
            ).then((res) => {
                if (!res.ok) return console.warn(res.text());
                queryClient.invalidateQueries();
            }),
    });

    return (
        <div>
            <P>Setup access from this search head to your Splunk Cloud stack.</P>

            <Heading level={2}>Step {step}.1 - Hostname</Heading>
            <P>
                Please enter the domain name of the Splunk Cloud search head you want to migrate
                configuration to.
            </P>
            <ControlGroup label="Hostname" labelWidth={90}>
                <Text
                    value={stack}
                    onChange={handleStack}
                    placeholder="customer.splunkcloud.com"
                    error={!stack_valid}
                />
            </ControlGroup>
            <Heading level={2}>Step {step}.2 - External Access Check</Heading>
            <P>
                To perform the migration, this Search Head will need access to the following domains
                using HTTPS. If these checks fail, either the stack name is incorrect or your
                proxy/firewall rules are prevent access.
            </P>
            <List>
                <List.Item>
                    <StatusCheck host="admin.splunk.com" /> admin.splunk.com:443
                </List.Item>
                <List.Item>
                    <StatusCheck host={api} disabled={!stack_valid} /> {api}
                </List.Item>
                <List.Item>
                    <StatusCheck host={hec} disabled={!stack_valid} /> {hec} (optional)
                </List.Item>
                <List.Item>
                    <StatusCheck host="splunkbase.splunk.com:443" /> splunkbase.splunk.com:443
                    (optional)
                </List.Item>
                <List.Item>
                    <StatusCheck host="api.ipify.org:443" /> api.ipify.org:443 (optional)
                </List.Item>
            </List>

            <Heading level={2}>Step {step}.3 - Access Token</Heading>
            <P>
                <Link to={`https://${stack}`}>Login to your Splunk Cloud</Link> and change your
                password if you have not already. Navigate to{' '}
                <Link to={`https://${stack}/manager/launcher/authorization/tokens`}>
                    Settings > Tokens
                </Link>{' '}
                and click "New Token". Set the Audience to anything like "Cloud Migration", but be
                sure to set Expiration to a relative time period long enough to complete this
                migration. I recomend "+30d".
            </P>

            <ControlGroup label="Access Token" labelWidth={90}>
                <Text
                    value={token}
                    onChange={handleToken}
                    error={token.length < 100}
                    disabled={!stack_valid}
                />
                <Button
                    onClick={() => mutatePassword.mutate()}
                    disabled={token.length < 100}
                    icon={(test >= 400 && <Error />) || (test >= 200 && <Success />) || <Save />}
                    error={test >= 400}
                >
                    Save and Test
                </Button>
            </ControlGroup>
            {test.fetchStatus == 'fetching' ? (
                <Message appearance="fill" type="info">
                    Testing Authentication Token
                </Message>
            ) : test.data === true ? (
                <Message appearance="fill" type="success">
                    Authentication successful
                </Message>
            ) : test.data === false ? (
                <Message appearance="fill" type="error">
                    Authentication failed
                </Message>
            ) : null}
            <Heading level={2}>Step {step}.4 - Compatibility</Heading>
            <P>This tool is only tested against Splunk Cloud Victoria</P>
            <DL>
                {Object.entries(test.data?.infrastructure || {}).map(([key, value]) => (
                    <React.Fragment key={key}>
                        <DL.Term>{key}</DL.Term>
                        <DL.Description>{value}</DL.Description>
                    </React.Fragment>
                ))}
            </DL>
        </div>
    );
};
