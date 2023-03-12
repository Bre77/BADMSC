import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApps, useGetApi } from '../shared/hooks';
import { isort0, wrapSetValue } from '../shared/helpers';

// Splunk UI
import Heading from '@splunk/react-ui/Heading';
import P from '@splunk/react-ui/Paragraph';
import Button from '@splunk/react-ui/Button';
import Table from '@splunk/react-ui/Table';
import Message from '@splunk/react-ui/Message';
import WaitSpinner from '@splunk/react-ui/WaitSpinner';
import Link from '@splunk/react-ui/Link';

const lookupHandle = (data) =>
    data.entry.reduce((x, { name, acl, content }) => {
        x[acl.app] ||= {};
        x[acl.app][name] = {
            perms: acl.perms,
            sharing: acl.sharing,
            path: content['eai:data'],
        };
        return x;
    }, {});

export default ({ step, config }) => {
    const src = useGetApi(config.src, 'services/data/lookup-table-files', lookupHandle);
    const dst = useGetApi(config.dst, 'services/data/lookup-table-files', lookupHandle);
    const src_apps = useApps(config.src);
    const dst_apps = useApps(config.dst);

    const isLoading = dst.isLoading || src.isLoading || dst_apps.isLoading;

    const lookups = useMemo(() => {
        if (isLoading) return [];

        const output = {};
        Object.entries(src.data).forEach(([app, files]) => {
            if (app in dst_apps.data) {
                Object.entries(files).forEach(([file, { perms, sharing, path, owner }]) => {
                    Object.keys(perms).forEach((rw) =>
                        perms[rw].map((group) => (group === 'admin' ? 'sc_admin' : group))
                    );
                    output[app] ||= {};
                    output[app][file] = {
                        perms,
                        sharing,
                        owner,
                        src: path,
                        dst: dst.data?.[app]?.[file]?.path,
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

                        <Table.HeadCell>Local</Table.HeadCell>
                        <Table.HeadCell>Cloud</Table.HeadCell>
                        <Table.HeadCell>Compare</Table.HeadCell>
                        <Table.HeadCell>Copy</Table.HeadCell>
                    </Table.Head>
                    <Table.Body>
                        {lookups.flatMap(([app, files]) =>
                            files.map(([file, { perms, sharing, src, dst }]) => (
                                <Table.Row key={app + '/' + file}>
                                    <Table.Cell>
                                        <b>{app}</b> / {file}
                                    </Table.Cell>
                                    <Table.Cell>{src && <Button>Open</Button>}</Table.Cell>
                                    <Table.Cell>{dst && <Button>Open</Button>}</Table.Cell>
                                    <Table.Cell>{dst && <Button>Compare</Button>}</Table.Cell>
                                    <Table.Cell>
                                        <Button>Copy</Button>
                                    </Table.Cell>
                                </Table.Row>
                            ))
                        )}
                    </Table.Body>
                </Table>
            )}
            <Heading level={2}>Step {step}.2 - Copy KVStore Data</Heading>
            <P>Somthing</P>
        </div>
    );
};
