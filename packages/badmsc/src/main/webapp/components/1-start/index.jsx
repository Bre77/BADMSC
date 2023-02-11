import React, { useState } from 'react';

// Splunk UI
import Heading from '@splunk/react-ui/Heading';
import P from '@splunk/react-ui/Paragraph';
import Text from '@splunk/react-ui/Text';
import ControlGroup from '@splunk/react-ui/ControlGroup';
import Link from '@splunk/react-ui/Link';
import List from '@splunk/react-ui/List';
import Button from '@splunk/react-ui/Button';

//Shared
import { wrapSetValue, StatusCheck } from '../../shared/helpers';

export default ({ setStep }) => {
    const [stack, setStack] = useState('customer.splunkcloud.com');
    const handleStack = wrapSetValue(setStack);
    if (stack.startsWith('https://')) setStack(stack.replace('https://', '').replace('/', ''));

    const splunkd = `${stack}:8089`;
    const hec = `http-inputs-${stack.replace(/^(es-|itsi-)/, '')}:443`;

    const [token, setToken] = useState('');
    const handleToken = wrapSetValue(setToken);

    return (
        <div>
            <Heading level={1}>Migrate to Splunk Cloud</Heading>
            <P>
                This app will help guide you through a DIY Splunk Cloud Migration. This app needs to
                be installed on the search head/cluster you wish to migrate. If your environment has
                multiple search heads/clusters, which is typical for ES and ITSI, then you will need
                to install this app on each of them and migrate to the relevant Splunk Cloud search
                heads.
            </P>
            <Heading level={2}>Step 1 - Access</Heading>

            <Heading level={3}>Step 1.1 - Hostname</Heading>
            <P>Please enter the full domain name to your Splunk Cloud stack.</P>
            <ControlGroup label="Hostname" labelWidth={90}>
                <Text
                    value={stack}
                    onChange={handleStack}
                    placeholder="customer.splunkcloud.com"
                    error={
                        stack == 'customer.splunkcloud.com' || !stack.endsWith('splunkcloud.com')
                    }
                />
            </ControlGroup>
            <Heading level={3}>Step 1.2 - External Access Check</Heading>
            <P>
                To perform the Splunk Cloud Migration, this Search Head will need access to the
                following domains using HTTPS.
            </P>
            <List>
                <List.Item>
                    <StatusCheck host={splunkd} /> {splunkd}
                </List.Item>
                <List.Item>
                    <StatusCheck host={hec} /> {hec}
                </List.Item>
                <List.Item>
                    <StatusCheck host="admin.splunk.com:443" /> admin.splunk.com:443
                </List.Item>
                <List.Item>
                    <StatusCheck host="splunkbase.splunk.com:443" /> splunkbase.splunk.com:443
                </List.Item>
            </List>
            <Button>Test External Access</Button>
            <Heading level={3}>Step 1.3 - Access Token</Heading>
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
                <Text value={token} onChange={handleToken} error={token.length < 100} />
                <Button disabled={token.length < 100}>Save and Test</Button>
            </ControlGroup>
        </div>
    );
};
