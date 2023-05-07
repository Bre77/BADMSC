import React, { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApps, useApi } from '../shared/hooks';
import { isort0, wrapSetValue } from '../shared/helpers';
import { OpenLookup, LookupCompare } from '../components/lookup';
import { handle } from '../shared/hooks';
import Lookup from '../components/lookup';

// Splunk UI
import Heading from '@splunk/react-ui/Heading';
import P from '@splunk/react-ui/Paragraph';
import WaitSpinner from '@splunk/react-ui/WaitSpinner';
import { request } from '../shared/fetch';

export default ({ step, config }) => {
    const mutation = (contents, app, file) =>
        request({
            url: `${config.dst.api}/servicesNS/nobody/-/storage/collections/data/${file}/batch_save`,
            method: 'POST',
            headers: {
                Authorization: `Bearer ${config.dst.token}`,
                'Content-Type': 'application/json',
            },
            json: contents
                .slice(1)
                .map((row) => Object.fromEntries(contents[0].map((e, i) => [e, row[i]]))),
        })
            .then(() =>
                request({
                    url: `${config.dst.api}/servicesNS/nobody/${app}/storage/collections/${file}/acl`,
                    method: 'GET',
                    params: { output_mode: 'json' },
                    headers: {
                        Authorization: `Bearer ${config.dst.token}`,
                    },
                })
            )
            .then(handle);

    return (
        <div>
            <P>KV Store are special lookups that leverage MongoDB.</P>
            <Heading level={2}>Step {step}.1 - Copy KV Store data</Heading>
            <Lookup
                config={config}
                type="kv"
                path="servicesNS/nobody/-/storage/collections/config"
                mutationFn={mutation}
            />
        </div>
    );
};
