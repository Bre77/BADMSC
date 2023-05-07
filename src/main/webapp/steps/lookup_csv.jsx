import React from 'react';

import { handle, useApps } from '../shared/hooks';
import { request } from '../shared/fetch';
import Lookup from '../components/lookup';

// Splunk UI
import Heading from '@splunk/react-ui/Heading';
import P from '@splunk/react-ui/Paragraph';
import Message from '@splunk/react-ui/Message';
import Link from '@splunk/react-ui/Link';

export default ({ step, config }) => {
    const src_apps = useApps(config.src);

    const mutation = (contents, app, file) =>
        request({
            url: `${config.dst.api}/servicesNS/nobody/lookup_editor/data/lookup_edit/lookup_contents`,
            method: 'POST',
            headers: {
                Authorization: `Bearer ${config.dst.token}`,
            },
            data: {
                lookup_file: file,
                namespace: app,
                contents: JSON.stringify(contents),
            },
        })
            .then(() =>
                request({
                    url: `${config.dst.api}/servicesNS/nobody/${app}/data/lookup-table-files/${file}/acl`,
                    method: 'GET',
                    params: { output_mode: 'json' },
                    headers: {
                        Authorization: `Bearer ${config.dst.token}`,
                    },
                })
            )
            .then(handle);
    /*.then((data) => {
            let acl = data.entry[0].acl;
        })*/

    return (
        <div>
            <P>
                Lookups are either CSV files or KV Store collections. Unfortuantely its difficult to
                know if a lookup is different, so you will need to use some disgression.
            </P>
            {src_apps.data && 'lookup_editor' in src_apps.data === false && (
                <Message appearance="fill" type="error">
                    Splunk App for Lookup File Editing is missing from this Search Head.{' '}
                    <Link to="/manager/badmsc/appsremote?offset=0&count=20&order=relevance&query=Lookup%20File%20Editing&support=splunk">
                        (Click here to open App Browser)
                    </Link>
                </Message>
            )}
            <Heading level={2}>Step {step}.1 - Copy CSV Lookup Files</Heading>
            <Lookup
                config={config}
                type="csv"
                path="servicesNS/nobody/-/data/lookup-table-files"
                mutationFn={mutation}
            />
        </div>
    );
};
