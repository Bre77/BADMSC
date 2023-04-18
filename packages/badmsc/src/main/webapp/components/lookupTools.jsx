import React, { useState, useRef, useMemo} from 'react';

// Splunk UI
import Button from '@splunk/react-ui/Button';
import Table from '@splunk/react-ui/Table';
import WaitSpinner from '@splunk/react-ui/WaitSpinner';
import Modal from '@splunk/react-ui/Modal';


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

    console.log(lookup)

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

export const LookupCompare = ({ hook, config, app, file,  }) => {
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