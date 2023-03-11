import React from 'react';
import Config from '../components/config';

// Splunk UI
import Heading from '@splunk/react-ui/Heading';
import P from '@splunk/react-ui/Paragraph';
import Message from '@splunk/react-ui/Message';

export default ({ step }) => {
    return (
        <div>
            <Message type="warning">This section is dangerous, please take care.</Message>
            <P>
                System configuration is typically the configuration Splunk includes out of the box
                and should not be modified. The differences below may the result of an admin
                modifying the system/local directory, or the differences between Splunk versions.
                Review the configuration very carefully and only copy it if you are sure you want to
                make these changes in your new Splunk Cloud.
            </P>

            <Heading level={2}>Step {step}.1 - Copy System Config</Heading>
            <Config scope="system" />
        </div>
    );
};
