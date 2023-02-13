import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAcs, useApi, handle } from '../../shared/hooks';

// Splunk UI
import Heading from '@splunk/react-ui/Heading';
import P from '@splunk/react-ui/Paragraph';
import Message from '@splunk/react-ui/Message';
import Text from '@splunk/react-ui/Text';
import { defaultFetchInit } from '@splunk/splunk-utils/fetch';
import { splunkdPath } from '@splunk/splunk-utils/config';
import Button from '@splunk/react-ui/Button';
import List from '@splunk/react-ui/List';
import WaitSpinner from '@splunk/react-ui/WaitSpinner';
import ControlGroup from '@splunk/react-ui/ControlGroup';
import { wrapSetValue } from '../../shared/helpers';

const Allowlist = ({ feature }) => {
    const query = useAcs(`access/${feature}/ipallowlists`, {
        notifyOnChangeProps: ['data', 'isLoading'],
    });
    return query.isLoading ? (
        <WaitSpinner />
    ) : (
        <List>
            {query.data?.subnets.length ? (
                query.data.subnets.map((subnet) => <List.Item key={subnet}>{subnet}</List.Item>)
            ) : (
                <List.Item>
                    <b>There are no subnets on this allow list</b>
                </List.Item>
            )}
        </List>
    );
};

const AddAllow = ({ suggestion, feature }) => {
    const [subnet, setSubnet] = useState('');
    const handleSubnet = wrapSetValue(setSubnet);
    useEffect(() => {
        if (!subnet && suggestion) setSubnet(`${suggestion}/32`);
    }, [suggestion]);
    const queryClient = useQueryClient();
    const addIp = useMutation({
        mutationFn: () =>
            fetch(
                `${splunkdPath}/services/badmsc/proxy?to=acs&uri=adminconfig/v2/access/${feature}/ipallowlists`,
                {
                    ...defaultFetchInit,
                    method: 'POST',
                    body: JSON.stringify({ subnets: [subnet] }),
                }
            ).then((res) => {
                if (!res.ok) return console.warn(res.json());
                queryClient.invalidateQueries({
                    queryKey: ['acs', `access/${feature}/ipallowlists`],
                });
                if (feature == 'search-api')
                    queryClient.invalidateQueries({
                        queryKey: ['api', 'services/admin/server-info'],
                    });
                setSubnet('');
            }),
    });
    return (
        <ControlGroup label="Add Subnet">
            <Text value={subnet} onChange={handleSubnet} placeholder="0.0.0.0/32" />
            <Button
                disabled={!subnet.match(/^[\da-f:.]+\/\d{1,2}$/i)}
                onClick={() => addIp.mutate()}
            >
                Add
            </Button>
        </ControlGroup>
    );
};

export default ({ setStep }) => {
    const test = useApi('services/admin/server-info');

    const sh_ip = useQuery({
        queryKey: ['wanip', 'sh'],
        queryFn: () =>
            fetch(`${splunkdPath}/services/badmsc/proxy?to=wan&uri=`, defaultFetchInit).then(
                (res) => (res.ok ? res.text() : Promise.reject(res.text()))
            ),
        staleTime: Infinity,
    });
    const user_ip = useQuery({
        queryKey: ['wanip', 'user'],
        queryFn: () =>
            fetch('https://api.ipify.org/').then((res) =>
                res.ok ? res.text() : Promise.reject(res.text())
            ),
        staleTime: Infinity,
    });

    return (
        <div>
            <Heading level={1}>Step 2 - IP Allow Lists</Heading>
            <P>
                To enable access to the Splunk Rest API in Splunk Cloud, the internet facing IP
                address of this search head, or of the network path it uses, must be added to the
                allow list. These can all be modified on your Splunk Cloud Search Head under
                <b> Settings > Server Settings > IP allow list</b>.
            </P>

            <Heading level={2}>Step 2.1 - Review Search Head API Allowlist</Heading>
            <P>This is the list of IP subnets currently allowed to access the Search Head API</P>
            <Allowlist feature="search-api" />
            <P>
                The internet facing IP address of this Search Head is{' '}
                <b>{(sh_ip.isSuccess && sh_ip.data) || 'unknown'}</b>.
            </P>
            <AddAllow suggestion={sh_ip.data} feature="search-api" />
            <Heading level={2}>Step 2.2 - Review Search Head UI Allowlist</Heading>
            <P>This is the list of IP subnets currently allowed to access the Search Head Web UI</P>
            <Allowlist feature="search-ui" />
            <P>
                The internet facing IP address of your computer is{' '}
                <b>{(user_ip.isSuccess && user_ip.data) || 'unknown'}</b>.
            </P>
            <AddAllow suggestion={user_ip.data} feature="search-ui" />
            <Heading level={2}>
                Step 2.3 - Review Splunk to Splunk (data forwarding) Allowlist
            </Heading>
            <P>This is the full list of IP subnets allowed to send data to Splunk Cloud</P>

            <Allowlist feature="s2s" />
            <P>
                If you know the internet facing IP addresses required for Splunk data forwarding,
                you can add them below.
            </P>
            <AddAllow feature="s2s" />
            <Heading level={2}>Step 2.4 - Required Access</Heading>
            <P>
                This App will need access to the Splunk Cloud Search Head API. If this following
                test fails you will need to modify the Search Head API allow list and wait a few
                minutes.
            </P>
            {test.fetchStatus == 'fetching' ? (
                <Message appearance="fill" type="info">
                    Testing connection to the Splunk Cloud Search Head REST API
                </Message>
            ) : test.isSuccess ? (
                <Message appearance="fill" type="success">
                    Successfully connected to the Splunk Cloud Search Head REST API
                </Message>
            ) : (
                <Message appearance="fill" type="error">
                    Failed to connect to the Splunk Cloud Search Head REST API
                </Message>
            )}
        </div>
    );
};
