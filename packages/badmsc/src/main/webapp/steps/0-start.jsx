import React, { useMemo } from 'react';
import { useProxy } from '../shared/hooks';

// Splunk UI
import Heading from '@splunk/react-ui/Heading';
import P from '@splunk/react-ui/Paragraph';
import List from '@splunk/react-ui/List';
import Message from '@splunk/react-ui/Message';
import Link from '@splunk/react-ui/Link';

export default ({ step }) => {
    const apps = useProxy('src', 'services/apps/local');

    const lookup_editor = useMemo(() => {
        return apps?.data?.find((app) => app.name === 'lookup_editor');
    }, [apps.data]);

    return (
        <div>
            <P>
                This app will help guide you through a DIY Splunk Cloud Migration. This app needs to
                be installed on the search head/cluster you wish to migrate. If your environment has
                multiple search heads/clusters, which is typical for ES and ITSI, then you will need
                to install this app on each of them and migrate to the relevant Splunk Cloud search
                heads.
            </P>
            <P>
                Use the buttons in the top right of the page to move between each step, however its
                recommended you perform each step in order.
            </P>
            <Heading level={2}>Requirements and Limitations</Heading>
            <List>
                <List.Item>
                    Splunk App for Lookup File Editing is required to migrate Lookups
                </List.Item>
                <List.Item>
                    Authentication to a user in Splunk Cloud with the sc_admin role is required
                </List.Item>
                <List.Item>
                    No config modifications in app default directories will be migrated (except for
                    private apps)
                </List.Item>
                <List.Item>No config modifications in system/local will be migrated</List.Item>
            </List>
            {!lookup_editor && (
                <Message appearance="fill" type="error">
                    Splunk App for Lookup File Editing is missing from this Search Head.{' '}
                    <Link to="/manager/badmsc/appsremote?offset=0&count=20&order=relevance&query=Lookup%20File%20Editing&support=splunk">
                        (Click here to open App Browser)
                    </Link>
                </Message>
            )}
        </div>
    );
};
