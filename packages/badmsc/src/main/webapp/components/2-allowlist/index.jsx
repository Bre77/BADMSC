import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
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
    const [subnet, setSubnet] = useState(suggestion);
    const addIp = useMutation({
        mutationFn: () =>
            fetch(
                `${splunkdPath}/services/badmsc/proxy/to=acs&uri=access/${feature}/ipallowlists`,
                {
                    ...defaultFetchInit,
                    method: 'POST',
                    body: JSON.stringify({ subnets: [subnet] }),
                }
            ).then((res) => {
                if (!res.ok) return console.warn(res.text());
                queryClient.invalidateQueries({
                    queryKey: ['acs', `access/${feature}/ipallowlists`],
                });
            }),
    });
    return (
        <ControlGroup label="Add Subnet">
            <Text value={subnet} />
            <Button onClick={() => addIp.mutate()}>Add</Button>
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
            <Heading level={1}>Step 2 - IP Allow List</Heading>
            <P>
                To enable access to the Splunk Rest API in Splunk Cloud, the internet facing IP
                address of this search head, or of the network path it uses, must be added to the
                allow list. These call all be modified on your Splunk Cloud Search Head under
                Settings > Server Settings > IP allow list
            </P>

            <Heading level={2}>Step 2.1 - Review Search Head API Access</Heading>
            <P>This is the list of IP subnets currently allowed to access the Search Head API</P>
            <Allowlist feature="search-api" />
            <P>
                The internet facing IP address of this Search Head is{' '}
                <b>{(sh_ip.isSuccess && sh_ip.data) || 'unknown'}</b>.
            </P>
            <AddAllow suggestion={sh_ip.data} feature="search_api" />
            <Heading level={2}>Step 2.2 - Review Search Head UI Access</Heading>
            <P>
                The internet facing IP address of your computer is{' '}
                <b>{(user_ip.isSuccess && user_ip.data) || 'unknown'}</b>. If it does not appear in
                the list below, then you may wish to add it.
            </P>
            <Allowlist feature="search-ui" />
            <AddAllow suggestion={user_ip.data} feature="search_ui" />
            <Heading level={2}>Step 2.3 - Review Splunk to Splunk (data forwarding) Access</Heading>
            <P>This is the full list of IP subnets allowed to send data to Splunk Cloud</P>
            <AddAllow suggestion={sh_ip.data} feature="s2s" />
            <Allowlist feature="s2s" />
            <Heading level={2}>Step 2.4 - Required Access</Heading>
            <P>
                If this following test fails you will need to add this IP to the Search API allow
                list.
            </P>
            {test.isLoading ? (
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
