import React from 'react';
import Heading from '@splunk/react-ui/Heading';
import P from '@splunk/react-ui/Paragraph';
import Text from '@splunk/react-ui/Text';
import ControlGroup from '@splunk/react-ui/ControlGroup';
import Message from '@splunk/react-ui/Message';
import { useQuery } from '@tanstack/react-query';
import { splunkdPath } from '@splunk/splunk-utils/config';
import { defaultFetchInit } from '@splunk/splunk-utils/fetch';

export default ({ setStep }) => {
    const test = useQuery({
        queryKey: ['api', 'server-info'],
        queryFn: () =>
            fetch(
                `${splunkdPath}/services/badmsc/proxy?to=api&uri=services/admin/server-info`,
                defaultFetchInit
            ).then((res) => res.json()),
        staleTime: Infinity,
    });

    const api = useQuery({
        queryKey: ['acs', 'access', 'search-api'],
        queryFn: () =>
            fetch(
                `${splunkdPath}/services/badmsc/proxy?to=acs&uri=adminconfig/v2/access/search-api/ipallowlists`,
                defaultFetchInit
            ).then((res) => res.json()),
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
            <Heading level={2}>Step 2.1 - REST Access</Heading>
            {(test.isLoading && (
                <Message appearance="fill" type="info">
                    Testing connection to the Splunk Cloud Search Head REST API
                </Message>
            )) ||
                (test.isSuccess && (
                    <Message appearance="fill" type="success">
                        Successfully connected to the Splunk Cloud Search Head REST API
                    </Message>
                )) || (
                    <Message appearance="fill" type="error">
                        Failed to connect to the Splunk Cloud Search Head REST API
                    </Message>
                )}

            {JSON.stringify(api.data)}

            <Heading level={2}>Step 2.2 - Web UI Access</Heading>
            <Heading level={2}>Step 2.3 - Splunk to Splunk (data forwarding) Access</Heading>
        </div>
    );
};
