import React, { useMemo, useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApps, useGetApi } from '../shared/hooks';
import { isort0, wrapSetValue } from '../shared/helpers';
import { request } from '../shared/fetch';

// Splunk UI
import Heading from '@splunk/react-ui/Heading';
import P from '@splunk/react-ui/Paragraph';
import Button from '@splunk/react-ui/Button';
import Table from '@splunk/react-ui/Table';
import Message from '@splunk/react-ui/Message';
import WaitSpinner from '@splunk/react-ui/WaitSpinner';
import Link from '@splunk/react-ui/Link';
import Modal from '@splunk/react-ui/Modal';

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

const LookupCopy = ({ app, file, config }) => {
    const queryClient = useQueryClient();
    const copy = useMutation(() =>
        getLookup(config.src, app, file)
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

const LookupCompare = ({ app, file, config }) => {
    const [same, setSame] = useState();
    const compare = useMutation(() =>
        Promise.all([
            getLookup(config.src, app, file).then((res) => res.text()),
            getLookup(config.dst, app, file).then((res) => res.text()),
        ]).then(([src, dst]) => setSame(src === dst))
    );
    return (
        <Button
            onClick={compare.mutate}
            disabled={compare.isLoading}
            appearance={
                (same === true && 'primary') || (same === false && 'destructive') || 'default'
            }
        >
            {(same === true && 'Same') || (same === false && 'Different') || 'Compare'}
        </Button>
    );
};

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

const OpenLookup = ({ app, file, target }) => {
    const modalToggle = useRef(null);
    const [open, setOpen] = useState(false);
    const lookup = useQuery({
        queryFn: () => getLookup(target, app, file),
        queryKey: ['lookup', app, file],
        enabled: open,
    });

    const handleRequestOpen = () => {
        setOpen(true);
    };

    const handleRequestClose = () => {
        setOpen(false);
        modalToggle?.current?.focus(); // Must return focus to the invoking element when the modal closes
    };

    return (
        <>
            <Button onClick={handleRequestOpen} ref={modalToggle} label="View" />
            <Modal onRequestClose={handleRequestClose} open={open}>
                <Modal.Body>
                    {lookup.isLoading ? <WaitSpinner /> : JSON.stringify(lookup.data)}
                </Modal.Body>
            </Modal>
        </>
    );
};

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
                                    <Table.Cell>
                                        {src && (
                                            <OpenLookup {...{ app, file, target: config.src }} />
                                        )}
                                    </Table.Cell>
                                    <Table.Cell>
                                        {dst && (
                                            <OpenLookup {...{ app, file, target: config.dst }} />
                                        )}
                                    </Table.Cell>
                                    <Table.Cell>
                                        {dst && <LookupCompare {...{ app, file, config }} />}
                                    </Table.Cell>
                                    <Table.Cell>
                                        <LookupCopy {...{ app, file, config }} />
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
