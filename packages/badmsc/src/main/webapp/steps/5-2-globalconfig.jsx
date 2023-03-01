import React from 'react';
import Config from '../shared/config';

// Splunk UI
import Heading from '@splunk/react-ui/Heading';
import P from '@splunk/react-ui/Paragraph';

export default ({ step }) => {
    return (
        <div>
            <P>
                Global configuration is avaliable to all users and all app contexts during search.
                If you skipped any apps in the previous step, you will not be able to migrate their
                configuration.
            </P>
            <Heading level={2}>Step {step}.1 - Copy Global Config</Heading>
            <Config scope="global" />
        </div>
    );
};
