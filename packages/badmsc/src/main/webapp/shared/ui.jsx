import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUI, useApi } from '../shared/hooks';
import { isort0 } from '../shared/helpers';

// Splunk UI
import Button from '@splunk/react-ui/Button';
import Table from '@splunk/react-ui/Table';
import WaitSpinner from '@splunk/react-ui/WaitSpinner';
import Code from '@splunk/react-ui/Code';

export default ({ folder }) => {
    const queryClient = useQueryClient();

    const dst = useUI('api', folder);
    const src = useUI('src', folder);
    const dst_apps = useProxy('src', 'services/apps/local');

    const isLoading = dst.isLoading || src.isLoading || dst_apps.isLoading;

    const ui = useMemo(() => {
        if (isLoading) return [];

        const apps = dst_apps.data.map((a) => a.name);

        const output = {};
        Object.entries(src.data).forEach(([app, files]) => {
            if (apps.includes(app)) {
                Object.entries(files).forEach(([file, { perms, sharing, data, digest }]) => {
                    if (digest !== dst.data?.[app]?.[file]?.digest) {
                        Object.keys(perms).forEach((rw) =>
                            perms[rw].map((group) => (group === 'admin' ? 'sc_admin' : group))
                        );
                        output[app] ||= {};
                        output[app][file] = {
                            perms,
                            sharing,
                            src: data,
                            dst: dst.data?.[app]?.[file]?.data,
                        };
                    }
                });
            }
        });
        return Object.entries(output)
            .sort(isort0)
            .map(([app, files]) => [app, Object.entries(files).sort(isort0)]);
    }, [dst.data, src.data, dst_apps.data]);

    return isLoading ? (
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
                {ui.flatMap(([app, files]) =>
                    files.map(([file, { perms, sharing, src, dst }]) => (
                        <Table.Row key={app + '/' + file}>
                            <Table.Cell>
                                <b>{app}</b> / {file}.xml
                            </Table.Cell>
                            <Table.Cell>
                                <Code language="xml" value={src} />
                            </Table.Cell>
                            <Table.Cell>
                                <Code language="xml" value={dst} />
                            </Table.Cell>
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
    );
};
