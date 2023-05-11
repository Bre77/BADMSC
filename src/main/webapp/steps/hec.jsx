import Button from '@splunk/react-ui/Button';
import Heading from '@splunk/react-ui/Heading';
import P from '@splunk/react-ui/Paragraph';
import Table from '@splunk/react-ui/Table';
import Typography from '@splunk/react-ui/Typography';
import { normalizeBoolean } from '@splunk/splunk-utils/boolean';
import React, { useMemo } from 'react';
import { ATTR_BLACKLIST } from '../shared/const';
import { useApi, useConfs, useDefaults } from '../shared/hooks';

export default ({ step, config }) => {
    const src = useApi(config.src, '/servicesNS/nobody/-/data/inputs/http');
    const dst = useApi(config.dst, '/servicesNS/nobody/-/data/inputs/http');

    return (
        <div>
            <P>
                HEC Inputs cannot be created from inputs.conf as they need to be pushed to the
                indexers
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
