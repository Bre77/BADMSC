import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useProxy, useLookups } from '../shared/hooks';
import { isort0, wrapSetValue } from '../shared/helpers';
import {} from '../shared/fetch';

// Splunk UI
import Heading from '@splunk/react-ui/Heading';
import P from '@splunk/react-ui/Paragraph';
import Button from '@splunk/react-ui/Button';
import Table from '@splunk/react-ui/Table';

import WaitSpinner from '@splunk/react-ui/WaitSpinner';

export default ({ step }) => {
    const queryClient = useQueryClient();

    const src = useLookups('src', 'services/data/lookup-table-files');
    const dst = useLookups('api', 'services/data/lookup-table-files');
    const dst_apps = useProxy('api', 'services/apps/local');

    const isLoading = dst.isLoading || src.isLoading || dst_apps.isLoading;

    const lookups = useMemo(() => {
        if (isLoading) return [];

        const apps = dst_apps.data.map((a) => a.name);

        const output = {};
        Object.entries(src.data).forEach(([app, files]) => {
            if (apps.includes(app)) {
                Object.entries(files).forEach(([file, { perms, sharing, path }]) => {
                    Object.keys(perms).forEach((rw) =>
                        perms[rw].map((group) => (group === 'admin' ? 'sc_admin' : group))
                    );
                    output[app] ||= {};
                    output[app][file] = {
                        perms,
                        sharing,
                        src: path,
                        dst: dst.data?.[app]?.[file]?.path,
                    };
                });
            }
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
            <Heading level={2}>Step {step}.1 - Copy CSV Lookup Files</Heading>
            {src.isLoading || dst.isLoading ? (
                <WaitSpinner size="large" />
            ) : (
                <Table stripeRows>
                    <Table.Head>
                        <Table.HeadCell>Name</Table.HeadCell>

                        <Table.HeadCell>Local</Table.HeadCell>
                        <Table.HeadCell>Cloud</Table.HeadCell>
                        <Table.HeadCell>Action</Table.HeadCell>
                    </Table.Head>
                    <Table.Body>
                        {lookups.flatMap(([app, files]) =>
                            files.map(([file, { perms, sharing, src, dst }]) => (
                                <Table.Row key={app + '/' + file}>
                                    <Table.Cell>
                                        <b>{app}</b> / {file}.xml
                                    </Table.Cell>
                                    <Table.Cell>{src}</Table.Cell>
                                    <Table.Cell>{dst}</Table.Cell>
                                    <Table.Cell>
                                        <Button>Copy</Button>
                                    </Table.Cell>
                                </Table.Row>
                            ))
                        )}
                        <Table.Row>
                            <Table.Cell></Table.Cell>
                            <Table.Cell></Table.Cell>
                            <Table.Cell></Table.Cell>
                            <Table.Cell>
                                <Button>Copy All</Button>
                            </Table.Cell>
                        </Table.Row>
                    </Table.Body>
                </Table>
            )}
            <Heading level={2}>Step {step}.2 - Copy KVStore Data</Heading>
            <P>Somthing</P>
        </div>
    );
};
