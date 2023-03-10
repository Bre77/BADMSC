import React from 'react';
import Conf from '../components/conf';

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
            <Heading level={2}>Step {step}.1 - Copy Private Knowledge Objects</Heading>
        </div>
    );
};
