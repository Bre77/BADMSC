import React from 'react';
import UI from '../components/ui';

// Splunk UI
import Heading from '@splunk/react-ui/Heading';
import P from '@splunk/react-ui/Paragraph';

export default ({ step }) => {
    return (
        <div>
            <P>
                Apps can contain customised navigation menus, in this step we will copy those over
                as required.
            </P>
            <Heading level={2}>Step {step}.1 - Navigation Copy</Heading>

            <UI folder="nav" />
        </div>
    );
};
