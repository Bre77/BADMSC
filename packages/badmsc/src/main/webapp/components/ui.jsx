import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useGetApi, useApps } from '../shared/hooks';
import { isort0 } from '../shared/helpers';

// Splunk UI
import Button from '@splunk/react-ui/Button';
import Table from '@splunk/react-ui/Table';
import WaitSpinner from '@splunk/react-ui/WaitSpinner';
import Code from '@splunk/react-ui/Code';

const handleUi = (data) =>
    data.entry.reduce((x, { name, acl, content }) => {
        x[acl.app] ||= {};
        x[acl.app][name] = {
            perms: acl.perms,
            sharing: acl.sharing,
            data: content['eai:data'],
            digest: content['eai:digest'],
        };
        return x;
    }, {});

export default ({ config, folder }) => {
    const src = useGetApi(config.src, `servicesNS/nobody/-/data/ui/${folder}`, handleUi);
    const dst = useGetApi(config.dst, `servicesNS/nobody/-/data/ui/${folder}`, handleUi);
    const dst_apps = useApps(config.dst);

    const isLoading = dst.isLoading || src.isLoading || dst_apps.isLoading;

    const ui = useMemo(() => {
        if (isLoading) return [];

        const output = {};
        Object.entries(src.data).forEach(([app, files]) => {
            if (app in dst_apps.data) {
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
            } else console.log(`Skipping ${app} because its not in cloud`);
        });
        return Object.entries(output)
            .sort(isort0)
            .map(([app, files]) => [app, Object.entries(files).sort(isort0)]);
    }, [dst.data, src.data, dst_apps.data]);

    const detailRow = (src, dst) => (
        <Table.Row>
            <Table.Cell></Table.Cell>
            <Table.Cell>
                <Code language="xml" value={src} />
            </Table.Cell>
            <Table.Cell>
                <Code language="xml" value={dst} />
            </Table.Cell>
            <Table.Cell></Table.Cell>
        </Table.Row>
    );

    return isLoading ? (
        <WaitSpinner size="large" />
    ) : (
        <Table stripeRows rowExpansion="single">
            <Table.Head>
                <Table.HeadCell>Name</Table.HeadCell>
                <Table.HeadCell>Local</Table.HeadCell>
                <Table.HeadCell>Cloud</Table.HeadCell>
                <Table.HeadCell>Action</Table.HeadCell>
            </Table.Head>
            <Table.Body>
                {ui.flatMap(([app, files]) =>
                    files.map(([file, { perms, sharing, src, dst }]) => (
                        <Table.Row key={app + '/' + file} expansionRow={detailRow(src, dst)}>
                            <Table.Cell>
                                <b>{app}</b> / {file}.xml
                            </Table.Cell>
                            <Table.Cell>{src && `${src?.split('\n').length} Lines`}</Table.Cell>
                            <Table.Cell>{dst && `${dst?.split('\n').length} Lines`}</Table.Cell>
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
