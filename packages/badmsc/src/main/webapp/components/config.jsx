import React, { useMemo } from 'react';
import { useMutation, useQueryClient, useQueries } from '@tanstack/react-query';
import { useApi, useConfigs, useDefaults } from '../shared/hooks';
import { isort0, latest } from '../shared/helpers';
import { CONF_FILES, ATTR_BLACKLIST } from '../shared/const';

// Splunk UI
import Button from '@splunk/react-ui/Button';
import Table from '@splunk/react-ui/Table';
import WaitSpinner from '@splunk/react-ui/WaitSpinner';
import Typography from '@splunk/react-ui/Typography';
import { normalizeBoolean } from '@splunk/splunk-utils/boolean';

export default ({ scope }) => {
    const def = useDefaults('src');
    const src = useConfigs('src');
    const dst = useConfigs('api');
    const dst_apps = useApi('services/apps/local');

    const isLoading =
        def.reduce((loading, query) => loading || query.isLoading, false) ||
        src.reduce((loading, query) => loading || query.isLoading, false) ||
        dst.reduce((loading, query) => loading || query.isLoading, false) ||
        dst_apps.isLoading;

    const config = useMemo(() => {
        if (isLoading) return [];

        const apps = dst_apps.data.map((a) => a.name);

        const output = {};
        CONF_FILES.forEach((file, f) => {
            if (dst[f].data && src[f].data) {
                Object.entries(src[f].data?.[scope] || {}).forEach(([app, stanzas]) => {
                    if (scope === 'system' || apps.includes(app)) {
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

    return isLoading || !config ? (
        <WaitSpinner size="large" />
    ) : (
        <Table stripeRows>
            <Table.Head>
                <Table.HeadCell>File</Table.HeadCell>
                <Table.HeadCell>Stanza</Table.HeadCell>
                <Table.HeadCell>Local Value</Table.HeadCell>
                <Table.HeadCell>Cloud Value</Table.HeadCell>
                <Table.HeadCell>Copy</Table.HeadCell>
            </Table.Head>
            <Table.Body>
                {config.flatMap(([app, files], i) => [
                    <Table.Row key={app}>
                        <Table.Cell>
                            <b>{app}</b>
                        </Table.Cell>
                        <Table.Cell></Table.Cell>
                        <Table.Cell></Table.Cell>
                        <Table.Cell></Table.Cell>
                        <Table.Cell>
                            <Button>Copy All</Button>
                        </Table.Cell>
                    </Table.Row>,
                    ...files.flatMap(([file, stanzas]) =>
                        stanzas.map(([stanza, { attr, perms }]) => (
                            <Table.Row key={app + file + stanza}>
                                <Table.Cell>
                                    {app} / {file}.conf
                                </Table.Cell>
                                <Table.Cell>{stanza}</Table.Cell>

                                <Table.Cell>
                                    <Typography as="code" variant="monoBody">
                                        {attr.map(([attr, { src }], i) => (
                                            <span key={i}>
                                                {src !== undefined && `${attr} = ${src}`}
                                                <br />
                                            </span>
                                        ))}
                                    </Typography>
                                </Table.Cell>
                                <Table.Cell>
                                    <Typography as="code" variant="monoBody">
                                        {attr.map(([attr, { dst }], i) => (
                                            <span key={i}>
                                                {dst !== undefined && `${attr} = ${dst}`}
                                                <br />
                                            </span>
                                        ))}
                                    </Typography>
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
