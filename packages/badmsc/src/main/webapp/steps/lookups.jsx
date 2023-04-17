import React, { useMemo, useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { handle, useApps, useGetApi } from '../shared/hooks';
import { isort0, wrapSetValue } from '../shared/helpers';
import { request } from '../shared/fetch';
import MutateButton from '../components/mutateButton';
import {OpenLookup,LookupCompare} from '../components/lookupTools';

// Splunk UI
import Heading from '@splunk/react-ui/Heading';
import P from '@splunk/react-ui/Paragraph';
import Button from '@splunk/react-ui/Button';
import Table from '@splunk/react-ui/Table';
import Message from '@splunk/react-ui/Message';
import WaitSpinner from '@splunk/react-ui/WaitSpinner';
import Link from '@splunk/react-ui/Link';

const getLookup = (target, app, file) =>
    request({
        url: `${target.api}/servicesNS/nobody/lookup_editor/data/lookup_edit/lookup_contents`,
        method: 'GET',
        headers: {
            Authorization: `Bearer ${target.token}`,
        },
        params: {
            lookup_file: file,
            namespace: app,
            lookup_type: 'csv',
        },
    });

const useLookup = (target, app, file, enabled) =>
    useQuery({
        queryFn: () => getLookup(target, app, file).then(handle),
        queryKey: [target.key, 'lookup', app, file],
        enabled,
    });

const LookupCopy = ({ app, file, config, label }) => {
    //const [enabled, setEnabled] = useState(false);
    const queryClient = useQueryClient();
    //const src = useLookup(config.src, app, file, enabled);

    const copy = useMutation(() =>
        getLookup(config.src, app, file) // I dont know how to make this use useLookup
            .then((res) => res.text()) // Comes in as JSON, goes out as JSON, no need to parse
            .then((contents) =>
                request({
                    url: `${config.dst.api}/servicesNS/nobody/lookup_editor/data/lookup_edit/lookup_contents`,
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${config.dst.token}`,
                    },
                    data: {
                        lookup_file: file,
                        namespace: app,
                        contents,
                    },
                })
            )
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
            .then(handle)
            .then((data) => {
                let acl = data.entry[0].acl;
            })
            .then(() => {
                queryClient.invalidateQueries(['dst', LOOKUP_ENDPOINT]);
            })
    );

    return <MutateButton mutation={copy} label={label} />;
};



const lookupHandle = (data) =>
    data.entry.reduce((x, { name, acl }) => {
        x[acl.app] ||= {};
        x[acl.app][name] = acl;
        return x;
    }, {});

export default ({ step, config }) => {
    const src = useGetApi(config.src, 'servicesNS/nobody/-/data/lookup-table-files', lookupHandle);
    const dst = useGetApi(config.dst, 'servicesNS/nobody/-/data/lookup-table-files', lookupHandle);
    const src_apps = useApps(config.src);
    const dst_apps = useApps(config.dst);

    const isLoading = dst.isLoading || src.isLoading || dst_apps.isLoading;

    const lookups = useMemo(() => {
        if (isLoading) return [];

        const output = {};
        Object.entries(src.data).forEach(([app, files]) => {
            if (app in dst_apps.data) {
                Object.entries(files).forEach(([file, acl]) => {
                    Object.keys(acl.perms).forEach(
                        (rw) =>
                            (acl.perms[rw] = acl.perms[rw].map((group) =>
                                group === 'admin' ? 'sc_admin' : group
                            ))
                    );
                    output[app] ||= {};
                    output[app][file] = {
                        src: acl,
                        dst: dst.data?.[app]?.[file],
                    };
                });
            } else console.log(`Skipping ${app} because its not in cloud`);
        });
        return Object.entries(output)
            .sort(isort0)
            .map(([app, files]) => [app, Object.entries(files).sort(isort0)]);
    }, [dst.data, src.data, dst_apps.data]);

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
            {src.isLoading || dst.isLoading ? (
                <WaitSpinner size="large" />
            ) : (
                <Table stripeRows>
                    <Table.Head>
                        <Table.HeadCell>Name</Table.HeadCell>
                        <Table.HeadCell>Scope</Table.HeadCell>
                        <Table.HeadCell>Local</Table.HeadCell>
                        <Table.HeadCell>Cloud</Table.HeadCell>
                        <Table.HeadCell>Compare</Table.HeadCell>
                        <Table.HeadCell>Action</Table.HeadCell>
                    </Table.Head>
                    <Table.Body>
                        {lookups.flatMap(([app, files]) =>
                            files.map(([file, { src, dst }]) => (
                                <Table.Row key={app + '/' + file}>
                                    <Table.Cell>
                                        <b>{app}</b> / {file}
                                    </Table.Cell>
                                    <Table.Cell>
                                        {src.sharing} / {dst?.sharing} {JSON.stringify(src.perms)}
                                    </Table.Cell>
                                    <Table.Cell>
                                        {src &&
                                            (!file.endsWith('.kmz') ? (
                                                <OpenLookup
                                                    {...{ hook: useLookup, target: config.src, app, file, }}
                                                />
                                            ) : (
                                                'Cannot display'
                                            ))}
                                    </Table.Cell>
                                    <Table.Cell>
                                        {dst &&
                                            (!file.endsWith('.kmz') ? (
                                                <OpenLookup
                                                    {...{ hook: useLookup, target: config.dst, app, file,  }}
                                                />
                                            ) : (
                                                'Cannot display'
                                            ))}
                                    </Table.Cell>
                                    <Table.Cell>
                                        {dst && <LookupCompare {...{hook: useCollection, app, file, config }} />}
                                    </Table.Cell>
                                    <Table.Cell>
                                        <LookupCopy
                                            {...{ app, file, config }}
                                            label={dst ? 'Overwrite' : 'Create'}
                                        />
                                    </Table.Cell>
                                </Table.Row>
                            ))
                        )}
                    </Table.Body>
                </Table>
            )}
        </div>
    );
};
