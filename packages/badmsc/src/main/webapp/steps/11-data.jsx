import React from 'react';

// Splunk UI
import Heading from '@splunk/react-ui/Heading';
import P from '@splunk/react-ui/Paragraph';

export default ({ step }) => {
    return (
        <div>
            <P>
                User (private) knowledge objects can be transferred as long as the user exists in
                Splunk Cloud. If you are using SSO then this requires them to have logged in once.
            </P>
            <Heading level={2}>Step {step} Option 1 - Dual Forwarding</Heading>
            <Heading level={2}>Step {step} Option 2 - _raw Event Copy</Heading>
        </div>
    );
};
