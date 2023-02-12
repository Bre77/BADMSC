import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAcs, useApi, handle } from '../../shared/hooks';

// Splunk UI
import Heading from '@splunk/react-ui/Heading';
import P from '@splunk/react-ui/Paragraph';
import Text from '@splunk/react-ui/Text';
import ControlGroup from '@splunk/react-ui/ControlGroup';
import Message from '@splunk/react-ui/Message';
import Link from '@splunk/react-ui/Link';

export default ({ setStep }) => {
    const test = useApi('services/admin/server-info');

    const access_api = useAcs('access/search-api/ipallowlists');
    const access_ui = useAcs('access/search-ui/ipallowlists');
    const access_s2s = useAcs('access/s2s/ipallowlists');

    const wanip = useQuery({
        queryKey: ['wanip'],
        queryFn: () => fetch('https://api.ipify.org/').then((res) => res.text()),
        staleTime: Infinity,
    });

    return (
        <div>
            <Heading level={1}>Step 2 - IP Allow List</Heading>
            <P>
                To enable access to the Splunk Rest API in Splunk Cloud, the internet facing IP
                address of this search head, or of the network path it uses, must be added to the
                allow list. While you are here you can also add other IP addresses that require
                access.
            </P>
            <P>{wanip.data}</P>
            <Heading level={2}>Step 2.1 - REST Access</Heading>
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

            {JSON.stringify(access_api.data)}
            <Heading level={2}>Step 2.2 - Web UI Access</Heading>
            <P>
                To modify{' '}
                <Link
                    to={`https://splunktrust.splunkcloud.com/manager/system/manage_system_config/ip_allow_list`}
                >
                    Go HERE
                </Link>
            </P>
            {JSON.stringify(access_ui.data)}
            <Heading level={2}>Step 2.3 - Splunk to Splunk (data forwarding) Access</Heading>
            {JSON.stringify(access_s2s.data)}
        </div>
    );
};
