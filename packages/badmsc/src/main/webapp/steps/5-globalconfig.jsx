import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSrc, useAcs } from '../shared/hooks';
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
import Events from '@splunk/react-icons/Events';
import Metrics from '@splunk/react-icons/Metrics';
import Number from '@splunk/react-ui/Number';
import Switch from '@splunk/react-ui/Switch';
import WaitSpinner from '@splunk/react-ui/WaitSpinner';
import { splunkdPath } from '@splunk/splunk-utils/config';
import { defaultFetchInit } from '@splunk/splunk-utils/fetch';

export default () => {
    const queryClient = useQueryClient();

    const cloud_apps = useAcs('apps/victoria');
    const local_apps = useSrc('services/apps/local');

    return (
        <div>
            <P>Install Splunkbase Apps or migrate .</P>
            <Heading level={2}>Step 3.1 - Splunkbase Apps</Heading>

            {cloud_apps.isLoading || local_apps.isLoading ? (
                <WaitSpinner size="large" />
            ) : (
                <Table stripeRows>
                    <Table.Head>
                        <Table.HeadCell>App Name</Table.HeadCell>

                        <Table.HeadCell>Local</Table.HeadCell>
                        <Table.HeadCell>Cloud</Table.HeadCell>
                        <Table.HeadCell>Action</Table.HeadCell>
                        <Table.HeadCell>Local Event/Metric Count</Table.HeadCell>
                        <Table.HeadCell>Cloud Searchable Days</Table.HeadCell>
                        <Table.HeadCell>Cloud Archive Days</Table.HeadCell>
                    </Table.Head>
                    <Table.Body></Table.Body>
                </Table>
            )}
            <Heading level={2}>Step 3.2 - Private Apps</Heading>
            <P>Somthing</P>
        </div>
    );
};
