import React from 'react';

// Splunk UI
import Heading from '@splunk/react-ui/Heading';
import P from '@splunk/react-ui/Paragraph';
import List from '@splunk/react-ui/List';
import Message from '@splunk/react-ui/Message';
import Link from '@splunk/react-ui/Link';

export default ({ step, config }) => {
    return (
        <div>
            <P>
                This app will help guide you through a like for like Splunk Cloud Migration. This
                app needs to be installed on the each Splunk role you need to migrate. If your
                environment has multiple search heads/clusters, which is typical for ES and ITSI,
                then you will need to install this app on each of them and migrate to the relevant
                Splunk Cloud search heads. You may also need to run this tool on an indexer or heavy
                forwarders to capture parsing configuration.
            </P>
            <P>
                Use the buttons in the top right of the page to move between each step. It's
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
        </div>
    );
};
