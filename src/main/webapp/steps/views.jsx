import React from 'react';
import UI from '../components/ui';

// Splunk UI
import Heading from '@splunk/react-ui/Heading';
import P from '@splunk/react-ui/Paragraph';

export default ({ step, config }) => {
    return (
        <div>
            <P>
                Dashboards and panels are saved as views. Many come built in to apps, but users also
                create their own within app contexts.
            </P>
            <Heading level={2}>Step {step}.1 - View Copy</Heading>

            <UI folder="views" config={config} />
        </div>
    );
};
