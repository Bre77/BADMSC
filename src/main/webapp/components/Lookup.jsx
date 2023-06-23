import Button from "@splunk/react-ui/Button";
import Link from "@splunk/react-ui/Link";
import { Message } from "@splunk/react-ui/Message";
import Modal from "@splunk/react-ui/Modal";
import Table from "@splunk/react-ui/Table";
import WaitSpinner from "@splunk/react-ui/WaitSpinner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useMemo, useRef, useState } from "react";
import { request } from "../shared/fetch";
import { isort0 } from "../shared/helpers";
import { handle, handleAcl, useApi, useApps } from "../shared/hooks";
import MutateButton from "./MutateButton";

const getLookupQuery = (target, namespace, lookup_file, lookup_type, owner, enabled = true) => ({
    queryFn: ({ signal }) =>
        request(
            {
                url: `${target.api}/servicesNS/${owner}/lookup_editor/data/lookup_edit/lookup_contents`,
                method: "GET",
                headers: {
                    Authorization: `Bearer ${target.token}`,
                },
                params: {
                    lookup_file,
                    namespace,
                    lookup_type,
                    owner,
                },
            },
            signal
        ).then(handle),
    queryKey: [target.key, lookup_type, namespace, lookup_file],
    enabled,
});

//const useLookup = (target, app, file, type, user, enabled) => useQuery(getLookupQuery(target, app, file, type, "nobody", enabled));

export const OpenLookup = ({ target, app, file, type, user }) => {
    const modalToggle = useRef(null);
    const [open, setOpen] = useState(false);
    const lookup = useQuery(getLookupQuery(target, app, file, type, user, open));

    const handleRequestOpen = () => {
        setOpen(true);
        console.log("open");
    };

    const handleRequestClose = () => {
        setOpen(false);
        console.log("close");
        modalToggle?.current?.focus(); // Must return focus to the invoking element when the modal closes
    };

    return (
        <>
            <Button onClick={handleRequestOpen} ref={modalToggle} label="View" />
            <Modal onRequestClose={handleRequestClose} open={open}>
                <Modal.Body>
                    {lookup.isLoading || !open ? (
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

export const LookupCompare = ({ config, app, file, type, src_user, dst_user }) => {
    const [enabled, setEnabled] = useState(false);
    const src = useQuery(getLookupQuery(config.src, app, file, type, src_user, enabled));
    const dst = useQuery(getLookupQuery(config.dst, app, file, type, dst_user, enabled));

    const same = useMemo(() => (src.data && dst.data ? JSON.stringify(src.data) === JSON.stringify(dst.data) : null), [src.data, dst.data]);

    const fetching = src.isFetching || dst.isFetching;

    return (
        <Button
            onClick={() => setEnabled(true)}
            disabled={fetching}
            appearance={(same === true && "primary") || (same === false && "destructive") || (fetching && "pill") || "default"}
        >
            {(same === true && "Same") || (same === false && "Different") || (fetching && "Loading") || "Compare"}
        </Button>
    );
};

const LookupCopy = ({ mutationFn, app, file, type, config, path, label, src, dst, dst_user }) => {
    const QueryClient = useQueryClient();
    const dst_path = `${config.dst.api}/servicesNS/${dst_user}/${app}/${path}/${file}`;
    const copy = useMutation(async () =>
        QueryClient.fetchQuery(getLookupQuery(config.src, app, file, type, src.owner)).then((contents) =>
            mutationFn(contents, app, file)
                .then(() =>
                    // If we already have the destination ACL, use that
                    // Otherwise fetch it safely (might not be required, originally saw 404s)
                    dst
                        ? { entry: [dst] }
                        : QueryClient.fetchQuery({
                              queryFn: () =>
                                  request({
                                      url: dst_path,
                                      method: "GET",
                                      params: { output_mode: "json" },
                                      headers: {
                                          Authorization: `Bearer ${config.dst.token}`,
                                      },
                                  }).then(handle),
                              queryKey: [config.dst.key, dst_path],
                              retry: 4,
                              cacheTime: 0,
                              staleTime: 0,
                          })
                )
                .then(handleAcl(config, dst_path, src, QueryClient))
                .then(lookupHandle)
                .then((data) => {
                    console.log(data);
                    QueryClient.setQueryData([config.dst.key, `servicesNS/${dst_user}/-/${path}`], (prev) => ({
                        ...prev,
                        [app]: { ...prev?.[app], ...data[app] },
                    }));
                    QueryClient.setQueryData([config.dst.key, type, app, file], contents);
                })
        )
    );
    return <MutateButton mutation={copy} label={label} />;
};

const lookupHandle = (data) =>
    data.entry.reduce((x, { name, acl }) => {
        x[acl.app] ||= {};
        x[acl.app][name] = acl;
        return x;
    }, {});

export default ({ config, type, path, mutationFn, src_user = "nobody", dst_user = "nobody" }) => {
    console.log("Lookup Redraw");
    const src = useApi(config.src, `servicesNS/${src_user}/-/${path}`, lookupHandle);
    const dst = useApi(config.dst, `servicesNS/${dst_user}/-/${path}`, lookupHandle);
    const src_apps = useApps(config.src);
    const dst_apps = useApps(config.dst);

    const isLoading = dst.isLoading || src.isLoading || src_apps.isLoading || dst_apps.isLoading;
    const hasEditor = src_apps.data && "lookup_editor" in src_apps.data;

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

    return isLoading ? (
        <WaitSpinner size="large" />
    ) : lookups.length ? (
        <>
            {!hasEditor && (
                <Message appearance="fill" type="error">
                    Splunk App for Lookup File Editing is required to read lookups, and appears to be missing from this Search Head.{" "}
                    <Link to="/manager/badmsc/appsremote?offset=0&count=20&order=relevance&query=Lookup%20File%20Editing&support=splunk">
                        Click here to open the App Browser and install it.
                    </Link>
                </Message>
            )}
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
                            <Table.Row key={app + "/" + file}>
                                <Table.Cell>
                                    <b>{app}</b> / {file}
                                </Table.Cell>
                                <Table.Cell>
                                    {src.sharing} > {dst?.sharing}
                                </Table.Cell>
                                <Table.Cell>
                                    {src &&
                                        (!file.endsWith(".kmz") && hasEditor ? (
                                            <OpenLookup
                                                {...{
                                                    target: config.src,
                                                    app,
                                                    file,
                                                    type,
                                                    user: src_user,
                                                }}
                                            />
                                        ) : (
                                            "Cannot display"
                                        ))}
                                </Table.Cell>
                                <Table.Cell>
                                    {dst &&
                                        (!file.endsWith(".kmz") && hasEditor ? (
                                            <OpenLookup
                                                {...{
                                                    target: config.dst,
                                                    app,
                                                    file,
                                                    type,
                                                    user: dst_user,
                                                }}
                                            />
                                        ) : (
                                            "Cannot display"
                                        ))}
                                </Table.Cell>
                                <Table.Cell>
                                    {dst &&
                                        (hasEditor ? (
                                            <LookupCompare config={config} app={app} file={file} type={type} src_user={src_user} dst_user={dst_user} />
                                        ) : (
                                            <Button disabled label="Compare" />
                                        ))}
                                </Table.Cell>
                                <Table.Cell>
                                    {hasEditor ? (
                                        <LookupCopy
                                            mutationFn={mutationFn}
                                            app={app}
                                            file={file}
                                            type={type}
                                            config={config}
                                            path={path}
                                            label={dst ? "Overwrite" : "Create"}
                                            src={src}
                                            dst={dst}
                                            dst_user={dst_user}
                                        />
                                    ) : (
                                        <Button disabled label={dst ? "Overwrite" : "Create"} />
                                    )}
                                </Table.Cell>
                            </Table.Row>
                        ))
                    )}
                </Table.Body>
            </Table>
        </>
    ) : (
        <Message>No modified {folder} found</Message>
    );
};
