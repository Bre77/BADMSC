import React, { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApps, useGetApi } from '../shared/hooks';
import { isort0, wrapSetValue } from '../shared/helpers';
import { OpenLookup, LookupCompare } from '../components/lookupTools';
import { handle } from '../shared/hooks';

// Splunk UI
import Heading from '@splunk/react-ui/Heading';
import P from '@splunk/react-ui/Paragraph';
import Button from '@splunk/react-ui/Button';
import Table from '@splunk/react-ui/Table';
import WaitSpinner from '@splunk/react-ui/WaitSpinner';
import { request } from '../shared/fetch';

const getCollection = (target, app, collection) =>
    request({
        url: `${target.api}/servicesNS/nobody/${app}/storage/collections/data/${collection}`,
        method: 'GET',
        headers: {
            Authorization: `Bearer ${target.token}`,
        },
    });

const useCollection = (target, app, collection, enabled) =>
    useQuery({
        queryFn: () => getCollection(target, app, collection).then(handle),
        queryKey: [target.key, 'kvstore', app, collection],
        enabled,
    });

const LookupCopy = ({ app, file, config }) => {
    const queryClient = useQueryClient();
    const copy = useMutation(() =>
        getCollection(config.src, app, file)
            .then((res) => res.json()) // Parse to avoid double encoding
            .then((json) =>
                request({
                    url: `${config.dst.api}/servicesNS/nobody/lookup_editor/data/lookup_edit/lookup_contents`,
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${config.dst.token}`,
                        'Content-Type': 'application/json',
                    },
                    json,
                }).then(() => {
                    queryClient.invalidateQueries(['dst', 'services/data/lookup-table-files']);
                })
            )
    );
    return (
        <Button onClick={copy.mutate} disabled={copy.isLoading}>
            Copy
        </Button>
    );
};

const lookupHandle = (data) =>
    data.entry.reduce((x, { name, acl }) => {
        x[acl.app] ||= {};
        x[acl.app][name] = acl;
        return x;
    }, {});

export default ({ step, config }) => {
    const src = useGetApi(
        config.src,
        `/servicesNS/nobody/-/storage/collections/config`,
        lookupHandle
    );
    const dst = useGetApi(
        config.dst,
        `/servicesNS/nobody/-/storage/collections/config`,
        lookupHandle
    );
    const dst_apps = useApps(config.dst);

    const isLoading = dst.isLoading || src.isLoading || dst_apps.isLoading;

    const lookups = useMemo(() => {
        if (isLoading) return [];

        const output = {};
        Object.entries(src.data).forEach(([app, files]) => {
            if (app in dst_apps.data) {
                Object.entries(files).forEach(([file, acl]) => {
                    /*Object.keys(acl.perms).forEach(
                        (rw) =>
                            (acl.perms[rw] = acl.perms[rw].map((group) =>
                                group === 'admin' ? 'sc_admin' : group
                            ))
                    );*/
                    output[app] ||= {};
                    output[app][file] = {
                        src: acl,
                        dst: !!dst.data?.[app]?.[file],
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
            <P>KV Store are special lookups that leverage MongoDB.</P>
            <Heading level={2}>Step {step}.1 - Copy KV Store data</Heading>
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
                        <Table.HeadCell>Copy</Table.HeadCell>
                    </Table.Head>
                    <Table.Body>
                        {lookups.flatMap(([app, files]) =>
                            files.map(([file, { src, dst }]) => (
                                <Table.Row key={app + '/' + file}>
                                    <Table.Cell>
                                        <b>{app}</b> / {file}
                                    </Table.Cell>
                                    <Table.Cell>
                                        {src.sharing} > {dst?.sharing}
                                    </Table.Cell>
                                    <Table.Cell>
                                        {src && (
                                            <OpenLookup
                                                {...{
                                                    hook: useCollection,
                                                    target: config.src,
                                                    app,
                                                    file,
                                                }}
                                            />
                                        )}
                                    </Table.Cell>
                                    <Table.Cell>
                                        {dst && (
                                            <OpenLookup
                                                {...{
                                                    hook: useCollection,
                                                    target: config.src,
                                                    app,
                                                    file,
                                                }}
                                            />
                                        )}
                                    </Table.Cell>
                                    <Table.Cell>
                                        {dst && (
                                            <LookupCompare
                                                {...{ hook: useCollection, config, app, file }}
                                            />
                                        )}
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
