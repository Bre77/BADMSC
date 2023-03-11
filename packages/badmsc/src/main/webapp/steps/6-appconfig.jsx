import React from 'react';
import Config from '../components/config';

// Splunk UI
import Heading from '@splunk/react-ui/Heading';
import P from '@splunk/react-ui/Paragraph';

export default ({ step }) => {
    return (
        <div>
            <P>
                App configuration is avaliable to all users but only when inside the specific app
                contexts during search. If you skipped any apps in the previous step, you will not
                be able to migrate their configuration.
            </P>
            <Heading level={2}>Step {step}.1 - Copy App Config</Heading>
            <Config scope="app" />
        </div>
    );
};
