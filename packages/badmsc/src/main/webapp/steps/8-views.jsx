import React from 'react';
import UI from '../components/ui';

// Splunk UI
import Heading from '@splunk/react-ui/Heading';
import P from '@splunk/react-ui/Paragraph';

export default ({ step }) => {
    return (
        <div>
            <P>SOMETHING ABOUT VIEWS</P>
            <Heading level={2}>Step {step}.1 - View Copy</Heading>

            <UI folder="views" />
        </div>
    );
};
