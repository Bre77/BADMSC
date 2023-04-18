import React, { useState, useRef, useMemo, useMutation } from 'react';

// Splunk UI
import Button from '@splunk/react-ui/Button';
import Table from '@splunk/react-ui/Table';
import WaitSpinner from '@splunk/react-ui/WaitSpinner';
import Modal from '@splunk/react-ui/Modal';
import { isort0 } from '../shared/helpers';
import { handle } from '../shared/hooks';
import MutateButton from '../components/mutateButton';

const getLookup = (target, app, file, path, type) =>
    request({
        url: `${target.api}/${path}`,
        method: 'GET',
        headers: {
            Authorization: `Bearer ${target.token}`,
        },
        params: {
            lookup_file: file,
            namespace: app,
            lookup_type: type,
        },
    });

export const OpenLookup = ({ hook, target, app, file }) => {
    const modalToggle = useRef(null);
    const [open, setOpen] = useState(false);
    const lookup = hook(target, app, file, open);

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
                    {lookup.isLoading ? (
                        <WaitSpinner />
                    ) : (
                        <Table stripeRows>
                            <Table.Head>
                                {lookup.data[0].map((cell, x) => (
                                    <Table.HeadCell key={x}>{cell}</Table.HeadCell>
                                ))}
                            </Table.Head>
                            <Table.Body>
                                {lookup.data.slice(1).map((row, x) => (
                                    <Table.Row key={x}>
                                        {row.map((cell, y) => (
                                            <Table.Cell key={y}>{cell}</Table.Cell>
                                        ))}
                                    </Table.Row>
                                ))}
                            </Table.Body>
                        </Table>
                    )}
                </Modal.Body>
            </Modal>
        </>
    );
};

export const LookupCompare = ({ hook, config, app, file }) => {
    const [enabled, setEnabled] = useState(false);
    const src = hook(config.src, app, file, enabled);
    const dst = hook(config.dst, app, file, enabled);

    const same = useMemo(
        () => (src.data && dst.data ? JSON.stringify(src.data) == JSON.stringify(dst.data) : null),
        [src.data, dst.data]
    );

    const fetching = src.isFetching || dst.isFetching;

    return (
        <Button
            onClick={() => setEnabled(true)}
            disabled={fetching}
            appearance={
                (same === true && 'primary') ||
                (same === false && 'destructive') ||
                (fetching && 'pill') ||
                'default'
            }
        >
            {(same === true && 'Same') ||
                (same === false && 'Different') ||
                (fetching && 'Loading') ||
                'Compare'}
        </Button>
    );
};

const LookupCopy = ({ mutationFn, app, file, config }) => {
    const copy = useMutation(() => mutationFn(app, file, config));
    return <MutateButton mutation={copy} label="Copy"/>

};

export default ({ config, get_path }) => {
    const src = useGetApi(config.src, get_path, lookupHandle);
    const dst = useGetApi(config.dst, get_path, lookupHandle);
    const src_apps = useApps(config.src);
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
                        dst: dst.data?.[app]?.[file],
                    };
                });
            } else console.log(`Skipping ${app} because its not in cloud`);
        });
        return Object.entries(output)
            .sort(isort0)
            .map(([app, files]) => [app, Object.entries(files).sort(isort0)]);
    }, [dst.data, src.data, dst_apps.data]);

    return src.isLoading || dst.isLoading ? (
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
                                {src.sharing} > {dst?.sharing}
                            </Table.Cell>
                            <Table.Cell>
                                {src &&
                                    (!file.endsWith('.kmz') ? (
                                        <OpenLookup
                                            {...{
                                                hook: useLookup,
                                                target: config.src,
                                                app,
                                                file,
                                            }}
                                        />
                                    ) : (
                                        'Cannot display'
                                    ))}
                            </Table.Cell>
                            <Table.Cell>
                                {dst &&
                                    (!file.endsWith('.kmz') ? (
                                        <OpenLookup
                                            {...{
                                                hook: useLookup,
                                                target: config.dst,
                                                app,
                                                file,
                                            }}
                                        />
                                    ) : (
                                        'Cannot display'
                                    ))}
                            </Table.Cell>
                            <Table.Cell>
                                {dst && (
                                    <LookupCompare {...{ hook: useLookup, app, file, config }} />
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
    );
};
