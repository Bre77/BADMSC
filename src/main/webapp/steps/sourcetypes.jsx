import React, { useMemo } from 'react';

// Splunk UI
import Heading from '@splunk/react-ui/Heading';
import P from '@splunk/react-ui/Paragraph';

import { handle, useApps, useConfs, useDefaults } from '../shared/hooks';
import { normalizeBoolean } from '@splunk/splunk-utils/boolean';
import { ATTR_BLACKLIST } from '../shared/const';
import Button from '@splunk/react-ui/Button';
import Table from '@splunk/react-ui/Table';
import WaitSpinner from '@splunk/react-ui/WaitSpinner';
import Typography from '@splunk/react-ui/Typography';

const PARSING = [
    'priority',
    'TRUNCATE',
    'LINE_BREAKER',
    'LINE_BREAKER_LOOKBEHIND',
    'SHOULD_LINEMERGE',
    'BREAK_ONLY_BEFORE_DATE',
    'BREAK_ONLY_BEFORE',
    'MUST_BREAK_AFTER',
    'MUST_NOT_BREAK_AFTER',
    'MUST_NOT_BREAK_BEFORE',
    'DATETIME_CONFIG',
    'TIME_PREFIX',
    'MAX_TIMESTAMP_LOOKAHEAD',
    'TIME_FORMAT',
    'TZ',
    'TZ_ALIAS',
    'MAX_DAYS_AGO',
    'MAX_DAYS_HENCE',
    'MAX_DIFF_SECS_AGO',
    'MAX_DIFF_SECS_HENCE',
    'ADD_EXTRA_TIME_FIELDS',
    'METRICS_PROTOCOL',
    'STATSD-DIM-TRANSFORMS',
    'TRANSFORMS',
    'CHECK_FOR_HEADER',
    'SEDCMD',
    'SEGMENTATION',
    'ANNOTATE_PUNCT',
    'description',
    'category',
    'REGEX',
    'FORMAT',
    'MATCH_LIMIT',
    'DEPTH_LIMIT',
    'CLONE_SOURCETYPE',
    'LOOKAHEAD',
    'WRITE_META',
    'DEST_KEY',
    'DEFAULT_VALUE',
    'SOURCE_KEY',
    'REPEAT_MATCH',
    'INGEST_EVAL',
    'REGEX',
    'REMOVE_DIMS_FROM_METRIC_NAME',
    'METRIC-SCHEMA-MEASURES',
    'METRIC-SCHEMA-BLACKLIST-DIMS',
    'METRIC-SCHEMA-WHITELIST-DIMS',
    'METRIC-SCHEMA-MEASURE',
];

const PARSING_STARTS_WITH = [
    'TRANSFORMS-',
    'SEDCMD-',
    'METRIC-SCHEMA-MEASURES-',
    'METRIC-SCHEMA-BLACKLIST-DIMS-',
    'METRIC-SCHEMA-WHITELIST-DIMS-',
];

const merge = (data) =>
    Object.entries(data)
        .sort((a, b) => (a[0] < b[0] ? 1 : -1))
        .reduce((x, [app, stanzas]) => {
            return Object.entries(stanzas).reduce((x, [stanza, { content }]) => {
                x[stanza] = { ...x[stanza], ...content };
                return x;
            }, x);
        }, {});

export default ({ step, config }) => {
    const [src_props, src_transforms] = useConfs(config.src, ['props', 'transforms']);
    const [dst_props, dst_transforms] = useConfs(config.dst, ['props', 'transforms']);
    const [def_props, def_transforms] = useDefaults(config.src, ['props', 'transforms']);

    const props = useMemo(() => {
        if (!src_props.data || !dst_props.data || !def_props.data) {
            return [];
        }

        const src = merge(src_props.data);
        const dst = merge(dst_props.data);

        return Object.entries(src).reduce((x, [stanza, content]) => {
            let required = Object.entries(content)
                .filter(
                    ([k, v]) =>
                        !ATTR_BLACKLIST.includes(k) &&
                        normalizeBoolean(def_props.data?.[k]) !== normalizeBoolean(v) &&
                        normalizeBoolean(dst?.[stanza]?.[k]) !== normalizeBoolean(v) &&
                        PARSING.some((z) => k.startsWith(z))
                )
                .map(([k, v]) => [k, v, dst?.[stanza]?.[k]]);
            required.length && x.push([stanza, required, !!dst?.[stanza]]);
            return x;
        }, []);
    }, [src_props.data, dst_props.data, def_props.data]);

    const transforms = useMemo(() => {
        if (!src_transforms.data || !dst_transforms.data || !def_transforms.data) {
            return [];
        }
        const src = merge(src_transforms.data);
        const dst = merge(dst_transforms.data);

        console.log(src_transforms.data, dst_transforms.data, def_transforms.data);

        return Object.entries(src).reduce((x, [stanza, content]) => {
            let required = Object.entries(content)
                .filter(
                    ([k, v]) =>
                        !ATTR_BLACKLIST.includes(k) &&
                        normalizeBoolean(def_transforms.data?.[k]) !== normalizeBoolean(v) &&
                        normalizeBoolean(dst?.[stanza]?.[k]) !== normalizeBoolean(v)
                )
                .map(([k, v]) => [k, v, dst?.[stanza]?.[k]]);
            required.length && x.push([stanza, required, !!dst?.[stanza]]);
            return x;
        }, []);
    }, [src_transforms.data, dst_transforms.data, def_transforms.data]);

    return (
        <div>
            <P>
                Splunk Cloud Victoria does not sync parsing configuration to the indexers, so we
                need to explicity put parsing configration in the 000-self-service app (Noah Bundle)
                using a specific API endpoint, or uploaded as a private app. Transforms need to be
                uploaded as private apps.
            </P>
            <P>
                If there will be no parsing in Splunk Cloud (using Heavy Forwarders) you can skip
                this step.
            </P>
            <Heading level={2}>Step {step}.1 - Copy/Select Sourcetypes</Heading>
            <Table stripeRows>
                <Table.Head>
                    <Table.HeadCell>Local</Table.HeadCell>
                    <Table.HeadCell>Cloud</Table.HeadCell>
                    <Table.HeadCell>Copy</Table.HeadCell>
                </Table.Head>
                <Table.Body>
                    {props.map(([stanza, content, present]) => (
                        <Table.Row key={stanza}>
                            <Table.Cell>
                                <Typography as="code" variant="monoBody">
                                    [{stanza}]<br />
                                    {content.map(([a, src, dst], i) => (
                                        <span key={i}>
                                            {src !== undefined && `${a} = ${src}`}
                                            <br />
                                        </span>
                                    ))}
                                </Typography>
                            </Table.Cell>
                            <Table.Cell>
                                {present && (
                                    <Typography as="code" variant="monoBody">
                                        [{stanza}]<br />
                                        {content.map(([a, src, dst], i) => (
                                            <span key={i}>
                                                {dst !== undefined && `${a} = ${dst}`}
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
                    ))}
                </Table.Body>
            </Table>
            <Heading level={2}>Step {step}.2 - Select Transforms</Heading>
            <Table stripeRows>
                <Table.Head>
                    <Table.HeadCell>Local</Table.HeadCell>
                    <Table.HeadCell>Cloud</Table.HeadCell>
                    <Table.HeadCell>Copy</Table.HeadCell>
                </Table.Head>
                <Table.Body>
                    {transforms.map(([stanza, content, present]) => (
                        <Table.Row key={stanza}>
                            <Table.Cell>
                                <Typography as="code" variant="monoBody">
                                    [{stanza}]<br />
                                    {content.map(([a, src, dst], i) => (
                                        <span key={i}>
                                            {src !== undefined && `${a} = ${src}`}
                                            <br />
                                        </span>
                                    ))}
                                </Typography>
                            </Table.Cell>
                            <Table.Cell>
                                {present && (
                                    <Typography as="code" variant="monoBody">
                                        [{stanza}]<br />
                                        {content.map(([a, src, dst], i) => (
                                            <span key={i}>
                                                {dst !== undefined && `${a} = ${dst}`}
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
                    ))}
                </Table.Body>
            </Table>
            <Heading level={2}>Step {step}.3 - Upload Private App</Heading>
        </div>
    );
};
