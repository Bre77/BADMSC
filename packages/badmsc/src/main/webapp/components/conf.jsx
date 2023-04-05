import React, { useMemo } from 'react';
import { useMutation, useQueryClient, useQueries } from '@tanstack/react-query';
import { handle, useApps, useConfs, useDefaults } from '../shared/hooks';
import { isort0, latest } from '../shared/helpers';
import { CONF_FILES, ATTR_BLACKLIST } from '../shared/const';
import { request } from '../shared/fetch';

// Splunk UI
import Button from '@splunk/react-ui/Button';
import Table from '@splunk/react-ui/Table';
import WaitSpinner from '@splunk/react-ui/WaitSpinner';
import Typography from '@splunk/react-ui/Typography';
import { normalizeBoolean } from '@splunk/splunk-utils/boolean';

export default ({ config, scope }) => {
    const def = useDefaults(config.src);
    const src = useConfs(config.src);
    const dst = useConfs(config.dst);
    const dst_apps = useApps(config.dst);

    const isLoading =
        def.some((query) => query.isLoading) ||
        src.some((query) => query.isLoading) ||
        dst.some((query) => query.isLoading) ||
        dst_apps.isLoading;

    const conf = useMemo(() => {
        if (isLoading) return [];

        const output = {};
        CONF_FILES.forEach((file, f) => {
            if (dst[f].data && src[f].data) {
                Object.entries(src[f].data || {}).forEach(([app, stanzas]) => {
                    if (scope === 'system' || app in dst_apps.data) {
                        Object.entries(stanzas).forEach(([stanza, { sharing, perms, content }]) => {
                            if (sharing != scope) return;
                            const sharing_correct =
                                dst[f].data?.[app]?.[stanza]?.sharing == sharing;

                            Object.keys(perms).forEach((rw) =>
                                perms[rw].map((group) => (group === 'admin' ? 'sc_admin' : group))
                            );

                            Object.entries(content).forEach(([attr, value]) => {
                                if (!ATTR_BLACKLIST.includes(attr)) {
                                    const src_value = normalizeBoolean(value);
                                    const def_value = normalizeBoolean(def[f].data?.[attr]);
                                    const dst_value = normalizeBoolean(
                                        dst[f].data?.[app]?.[stanza]?.content?.[attr]
                                    );

                                    if (
                                        src_value !== def_value &&
                                        (src_value !== dst_value || !sharing_correct)
                                    ) {
                                        output[app] ||= {};
                                        output[app][file] ||= {};
                                        output[app][file][stanza] ||= {
                                            attr: {},
                                            exists: !!dst[f].data?.[app]?.[stanza],
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
                                        {attr.map(([a, { src }], i) => (
                                            <span key={i}>
                                                {src !== undefined && `${a} = ${src}`}
                                                <br />
                                            </span>
                                        ))}
                                    </Typography>
                                </Table.Cell>
                                <Table.Cell>
                                    {exists && (
                                        <Typography as="code" variant="monoBody">
                                            [{stanza}]<br />
                                            {attr.map(([a, { dst }], i) => (
                                                <span key={i}>
                                                    {dst !== undefined && `${a} = ${dst}`}
                                                    <br />
                                                </span>
                                            ))}
                                        </Typography>
                                    )}
                                </Table.Cell>
                                <Table.Cell>
                                    <CopyConfig
                                        {...{
                                            config,
                                            scope,
                                            file,
                                            app,
                                            stanza,
                                            attr,
                                            perms,
                                            exists,
                                        }}
                                    />
                                </Table.Cell>
                            </Table.Row>
                        ))
                    ),
                ])}
            </Table.Body>
        </Table>
    );
};

const CopyConfig = ({ config, scope, file, app, stanza, attr, perms, exists }) => {
    const copy = useMutation(() => {
        const data = Object.fromEntries(attr.map((a) => [a.attr, a.src]));
        return (
            exists
                ? request({
                      url: `${config.dst.api}/servicesNS/nobody/${app}/configs/conf-${file}/stanza`,
                      method: 'POST',
                      data,
                      params: { output_mode: 'json', count: -1 },
                      headers: {
                          Authorization: `Bearer ${config.dst.token}`,
                      },
                  })
                : request({
                      url: `${config.dst.api}/servicesNS/nobody/${app}/configs/conf-${file}`,
                      method: 'POST',
                      data: { ...data, name: stanza },
                      params: { output_mode: 'json', count: -1 },
                      headers: {
                          Authorization: `Bearer ${config.dst.token}`,
                      },
                  })
        ).then(handle);
        //.then((data) => if(data.entry[0].acl.));
    });

    return (
        <Button onClick={copy.mutate} disabled={copy.isLoading}>
            {exists ? 'Update' : 'Create'}
        </Button>
    );
};
