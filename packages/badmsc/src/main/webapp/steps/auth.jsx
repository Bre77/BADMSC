import React, { useState, useEffect, useReducer } from 'react';

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
import { handle, useAcs, useConfig, useGetApi } from '../shared/hooks';

const StatusCheck = ({ host, disabled, method = 'OPTIONS' }) => {
    const { data, isLoading } = useQuery({
        queryKey: ['check', host],
        queryFn: () =>
            request({
                url: `https://${host}`,
                method,
            }).then((res) => res.ok),

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

const dropHTTPS = (prev, stack) => stack.replace('https://', '');

const e = (query) => (query.isError ? query.error : false);

export default ({ step, config }) => {
    const [src_api, setSrcApi] = useReducer(dropHTTPS, '');
    const handleSrcApi = wrapSetValue(setSrcApi);
    const src_api_valid = useMutation(() => request({ url: src_api, method: 'GET' }).then(handle));
    const [src_token, setSrcToken] = useState('');
    const handleSrcToken = wrapSetValue(setSrcToken);
    const src_token_valid = useQuery({
        queryFn: () =>
            request({
                url: `${src_api}/services/server/info`,
                method: 'GET',
                headers: { Authorization: `Bearer ${src_token}` },
            }).then(handle),
        queryKey: ['test', 'src_api', src_api],
        enabled: src_api !== '' && src_token !== '',
    });

    const [dst_sh, setDstSh] = useReducer(dropHTTPS, '');
    const handleDstSh = wrapSetValue(setDstSh);
    const [dst_api, setDstApi] = useReducer(dropHTTPS, '');
    const handleDstApi = wrapSetValue(setDstApi);
    const dst_api_valid = useQuery({
        queryFn: () => request({ url: dst_api, method: 'GET' }).then(handle),
        queryKey: ['test', 'dst_api', dst_api],
        enabled: dst_api !== '',
    });
    const [dst_token, setDstToken] = useState('');
    const handleDstToken = wrapSetValue(setDstToken);
    const dst_token_valid = useQuery({
        queryFn: () =>
            request({
                url: `${dst_api}/services/server/info`,
                method: 'GET',
                headers: { Authorization: `Bearer ${dst_token}` },
            }).then(handle),
        queryKey: ['test', 'src_api', dst_api],
        enabled: dst_api !== '' && dst_token !== '',
    });

    const [dst_acs, setDstAcs] = useReducer(dropHTTPS, '');
    const handleDstAcs = wrapSetValue(setDstAcs);
    const dst_acs_valid = useAcs(
        dst_acs !== '' && dst_token !== '' && { acs: dst_acs, token: dst_token },
        'status'
    );

    const stack_valid = dst_sh.endsWith('.splunkcloud.com');

    useEffect(() => {
        if (stack_valid) {
            let stack = dst_sh.replace(/^(es-|itsi-)/, '');
            setDstApi(`${dst_sh}:8089`);
            setDstAcs(`admin.splunk.com/${stack.replace('.splunkcloud.com', '')}`);
        }
    }, [dst_sh]);

    useEffect(() => {
        if (config?.src?.api) setSrcApi(config.src.api);
        if (config?.src?.token) setSrcToken(config.src.token);

        if (config?.dst?.sh) setDstSh(config.dst.sh);
        if (config?.dst?.token) setDstToken(config.dst.token);
        if (config?.dst?.api) setDstApi(config.dst.api);
        if (config?.dst?.acs) setDstAcs(config.dst.acs);
    }, [config]);

    //const apiTest = useGetApi({ api, token }, 'services/admin/server-info');

    const queryClient = useQueryClient();
    const mutatePassword = useMutation({
        mutationFn: () => {
            const payload = JSON.stringify({
                src: { api: src_api, token: src_token },
                dst: {
                    sh: dst_sh,
                    token: dst_token,
                    api: dst_api,
                    acs: dst_acs,
                    hec: dst_hec,
                },
            });
            return (
                config
                    ? fetch(
                          `${splunkdPath}/servicesNS/${username}/badmsc/storage/passwords/badmsc%3Aauth%3A?output_mode=json`,
                          {
                              ...defaultFetchInit,
                              method: 'POST',
                              body: makeBody({
                                  password: payload,
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
                                  password: payload,
                              }),
                          }
                      )
            ).then((res) => {
                if (!res.ok) return console.warn(res.text());
                queryClient.invalidateQueries();
            });
        },
    });

    return (
        <div>
            <P>
                Setup access to both your source system and the target Splunk Cloud stack. Ideally
                you should be running this tool on the Splunk system you want to migrate, however if
                that system does not have a Web UI or is otherwise inaccessible you can set it as
                the source below.
            </P>
            <Message appearance="fill" type="info">
                Do not include https:// in any inputs. HTTPS is mandatory for all communication and
                will be automatically enforced.
            </Message>

            <Heading level={2}>Step {step}.1 - Source System</Heading>
            <P>
                Please enter the REST API endpoint and authentication token for the source Splunk
                system. Leave blank to use the current system.
            </P>
            <ControlGroup
                label="REST API"
                labelWidth={90}
                error={e(src_api_valid)}
                help="Exclude Protocol, include port. Leave blank to use this server"
            >
                <Text value={src_api} onChange={handleSrcApi} placeholder="localhost:8089" />
            </ControlGroup>
            <ControlGroup
                label="Auth Token"
                labelWidth={90}
                error={e(src_token_valid)}
                help="User should have admin role. Leave blank to use your user"
            >
                <Text
                    value={src_token}
                    error={src_api !== '' && src_token.length < 100}
                    onChange={handleSrcToken}
                    passwordVisibilityToggle
                />
                <Button inline>Test</Button>
            </ControlGroup>

            <Heading level={2}>Step {step}.2 - Splunk Cloud</Heading>
            <P>
                Please enter the domain name of the Splunk Cloud search head you want to migrate
                configuration to. This will be forced to use HTTPS and port 8089.
            </P>
            <ControlGroup
                label="Search Head"
                labelWidth={90}
                error={e(dst_api_valid)}
                help="Excluded Protocol, include port"
            >
                <Text
                    value={dst_sh}
                    onChange={handleDstSh}
                    placeholder="customer.splunkcloud.com"
                    error={!stack_valid}
                />
            </ControlGroup>
            <ControlGroup
                label="REST API"
                labelWidth={90}
                error={e(src_api_valid)}
                help="Excluded protocol, include port"
            >
                <Text
                    value={dst_api}
                    onChange={handleDstApi}
                    placeholder="customer.splunkcloud:8089"
                    disabled={dst_sh == ''}
                />
            </ControlGroup>
            <ControlGroup
                label="ACS"
                labelWidth={90}
                error={e(dst_acs_valid)}
                help="Excluded protocol and trailing slash"
            >
                <Text
                    value={dst_acs}
                    onChange={handleDstAcs}
                    placeholder="admin.splunk.com/customer"
                    disabled={dst_sh == ''}
                />
            </ControlGroup>
            <ControlGroup
                label="Auth Token"
                labelWidth={90}
                error={dst_token_valid}
                help="User must have sc_admin role"
            >
                <Text
                    inline
                    value={dst_token}
                    onChange={handleDstToken}
                    error={dst_token.length < 100}
                    disabled={dst_sh == ''}
                    passwordVisibilityToggle
                />
                <Button inline>Test</Button>
            </ControlGroup>
            <Heading level={2}>Step {step}.3 - Save</Heading>
            <Button
                onClick={mutatePassword.mutate}
                disabled={mutatePassword.isLoading}
                label="Save"
            />

            <Heading level={2}>Step {step}.4 - External Access Check</Heading>
            <P>
                To perform the migration, this Search Head will need access to the following domains
                using HTTPS. If these checks fail, either the stack name is incorrect or your
                proxy/firewall rules are prevent access.
            </P>
            <List>
                <List.Item>
                    <StatusCheck host="api.splunk.com" method="GET" /> api.splunk.com
                </List.Item>
                <List.Item>
                    <StatusCheck host="splunkbase.splunk.com" /> splunkbase.splunk.com
                </List.Item>
                <List.Item>
                    <StatusCheck host="api.ipify.org" /> api.ipify.org (optional)
                </List.Item>
            </List>

            <Heading level={2}>Step {step}.4 - Compatibility</Heading>
            <P>This tool is only tested against Splunk Cloud Victoria</P>
            <DL>
                {Object.entries(dst_acs_valid.data?.infrastructure || {}).map(([key, value]) => (
                    <React.Fragment key={key}>
                        <DL.Term>{key}</DL.Term>
                        <DL.Description>{value}</DL.Description>
                    </React.Fragment>
                ))}
            </DL>
        </div>
    );
};
