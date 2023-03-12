import React, { useMemo } from 'react';
import { useMutation, useQueryClient, useQueries } from '@tanstack/react-query';
import { handle, useApps } from '../shared/hooks';
import { isort0, latest } from '../shared/helpers';
import { CONF_FILES, ATTR_BLACKLIST } from '../shared/const';

// Splunk UI
import Button from '@splunk/react-ui/Button';
import Table from '@splunk/react-ui/Table';
import WaitSpinner from '@splunk/react-ui/WaitSpinner';
import Typography from '@splunk/react-ui/Typography';
import { normalizeBoolean } from '@splunk/splunk-utils/boolean';
import { request } from '../shared/fetch';

const useConfigs = (target, files = CONF_FILES) =>
    useQueries({
        queries: files.map((file) => ({
            queryKey: [target.key, 'config', file],
            queryFn: () =>
                request({
                    url: `${target.api}/servicesNS/nobody/-/configs/conf-${file}`,
                    method: 'GET',
                    params: { output_mode: 'json', count: -1 },
                    headers: {
                        Authorization: `Bearer ${target.token}`,
                    },
                })
                    .then(handle)
                    .then((data) =>
                        data.entry.reduce(
                            (x, { name, acl, content }) => {
                                x[acl.sharing][acl.app] ||= {};
                                x[acl.sharing][acl.app][name] = { perms: acl.perms, content };
                                return x;
                            },
                            { system: {}, global: {}, app: {} }
                        )
                    ),
            staleTime: Infinity,
        })),
    });

const useDefaults = (target, files = CONF_FILES) =>
    useQueries({
        queries: files.map((file) => ({
            queryKey: [target.key, 'default', file],
            queryFn: () =>
                request({
                    url: `${target.api}/services/properties/${file}/default`,
                    method: 'GET',
                    params: { output_mode: 'json', count: -1 },
                    headers: {
                        Authorization: `Bearer ${target.token}`,
                    },
                })
                    .then(handle)
                    .then((data) =>
                        data.entry.reduce((x, { name, content }) => {
                            x[name] = content;
                            return x;
                        }, {})
                    )
                    .catch(() => ({})),
            staleTime: Infinity,
        })),
    });

export default ({ config, scope }) => {
    const def = useDefaults(config.src);
    const src = useConfigs(config.src);
    const dst = useConfigs(config.dst);
    const dst_apps = useApps(config.dst);

    const isLoading =
        def.reduce((loading, query) => loading || query.isLoading, false) ||
        src.reduce((loading, query) => loading || query.isLoading, false) ||
        dst.reduce((loading, query) => loading || query.isLoading, false) ||
        dst_apps.isLoading;

    const conf = useMemo(() => {
        if (isLoading) return [];

        const output = {};
        CONF_FILES.forEach((file, f) => {
            if (dst[f].data && src[f].data) {
                Object.entries(src[f].data?.[scope] || {}).forEach(([app, stanzas]) => {
                    if (scope === 'system' || app in dst_apps.data) {
                        Object.entries(stanzas).forEach(([stanza, { perms, content }]) => {
                            Object.keys(perms).forEach((rw) =>
                                perms[rw].map((group) => (group === 'admin' ? 'sc_admin' : group))
                            );

                            Object.entries(content).forEach(([attr, value]) => {
                                if (!ATTR_BLACKLIST.includes(attr)) {
                                    const src_value = normalizeBoolean(value);
                                    const def_value = normalizeBoolean(def[f].data?.[attr]);
                                    const dst_value = normalizeBoolean(
                                        dst[f].data?.[scope]?.[app]?.[stanza]?.content?.[attr]
                                    );

                                    if (src_value !== def_value && src_value !== dst_value) {
                                        output[app] ||= {};
                                        output[app][file] ||= {};
                                        output[app][file][stanza] ||= {
                                            attr: {},
                                            exists: !!dst[f].data?.[scope]?.[app]?.[stanza],
                                            perms,
                                        };
                                        output[app][file][stanza].attr[attr] = {
                                            src: src_value,
                                            dst: dst_value,
                                        };
                                    }
                                }
                            });
                        });
                    }
                });
            }
        });
        return Object.entries(output)
            .sort(isort0)
            .map(([app, files]) => [
                app,
                Object.entries(files).map(([file, stanzas]) => [
                    file,
                    Object.entries(stanzas)
                        .sort(isort0)
                        .map(([stanza, content]) => [
                            stanza,
                            {
                                ...content,
                                attr: Object.entries(content.attr).sort(isort0),
                            },
                        ]),
                ]),
            ]);
    }, [latest(def), latest(src), latest(dst), dst_apps.data]);

    return isLoading || !conf ? (
        <WaitSpinner size="large" />
    ) : (
        <Table stripeRows>
            <Table.Head>
                <Table.HeadCell>File</Table.HeadCell>
                <Table.HeadCell>Local</Table.HeadCell>
                <Table.HeadCell>Cloud</Table.HeadCell>
                <Table.HeadCell>Copy</Table.HeadCell>
            </Table.Head>
            <Table.Body>
                {conf.flatMap(([app, files], i) => [
                    <Table.Row key={app}>
                        <Table.Cell>
                            <b>{app}</b>
                        </Table.Cell>
                        <Table.Cell></Table.Cell>
                        <Table.Cell></Table.Cell>
                        <Table.Cell></Table.Cell>
                    </Table.Row>,
                    ...files.flatMap(([file, stanzas]) =>
                        stanzas.map(([stanza, { attr, perms, exists }]) => (
                            <Table.Row key={app + file + stanza}>
                                <Table.Cell>
                                    {app} / {file}.conf
                                </Table.Cell>
                                <Table.Cell>
                                    <Typography as="code" variant="monoBody">
                                        [{stanza}]<br />
                                        {attr.map(([attr, { src }], i) => (
                                            <span key={i}>
                                                {src !== undefined && `${attr} = ${src}`}
                                                <br />
                                            </span>
                                        ))}
                                    </Typography>
                                </Table.Cell>
                                <Table.Cell>
                                    {exists && (
                                        <Typography as="code" variant="monoBody">
                                            [{stanza}]<br />
                                            {attr.map(([attr, { dst }], i) => (
                                                <span key={i}>
                                                    {dst !== undefined && `${attr} = ${dst}`}
                                                    <br />
                                                </span>
                                            ))}
                                        </Typography>
                                    )}
                                </Table.Cell>
                                <Table.Cell>
                                    <Button>Copy</Button>
                                </Table.Cell>
                            </Table.Row>
                        ))
                    ),
                ])}
            </Table.Body>
        </Table>
    );
};
