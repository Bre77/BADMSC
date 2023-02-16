import React from 'react';

// Splunk UI
import Heading from '@splunk/react-ui/Heading';
import P from '@splunk/react-ui/Paragraph';

export default ({ step }) => {
    return (
        <div>
            <P>
                This app will help guide you through a DIY Splunk Cloud Migration. This app needs to
                be installed on the search head/cluster you wish to migrate. If your environment has
                multiple search heads/clusters, which is typical for ES and ITSI, then you will need
                to install this app on each of them and migrate to the relevant Splunk Cloud search
                heads.
            </P>
            <P>
                Use the buttons in the top right of the page to move between each step, however its
                recommended you perform each step in order.
            </P>
        </div>
    );
};
