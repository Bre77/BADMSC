import React, { useMemo } from 'react';

// Splunk UI
import Heading from '@splunk/react-ui/Heading';
import P from '@splunk/react-ui/Paragraph';
import { useApi } from '../shared/hooks';
import Table from '@splunk/react-ui/Table';
import MutateButton from '../components/mutateButton';
import { useMutation } from '@tanstack/react-query';
import { Typography } from '@splunk/react-ui/Typography';
import { request } from '../shared/fetch';

const handleRoles = (data) =>
    Object.fromEntries(data.entry.map(({ name, content }) => [name, content]));


const CreateButton = (config, role, data, label) => {

    const create = useMutation( () => request({
        url: `${config.dst.url}/services/authorization/roles/${role}`,
        method: 'POST',
        data,
        params: { output_mode: 'json' },
        headers: {
            Authorization: `Bearer ${config.dst.token}`,
        },
    }));

    return <MutateButton mutation={create} label={label} data={data} />;
}

export default ({ step, config }) => {
    const src = useApi(config.src, 'services/authorization/roles', handleRoles);
    const dst = useApi(config.dst, 'services/authorization/roles', handleRoles);
    

    const isLoading = src.isLoading || dst.isLoading;

    const roles = useMemo(() => {
        if (isLoading) return [];
        return Object.entries(src.data)
            .filter(([name]) => name != 'admin')
            .map(([name, content]) =>
                dst.data[name]
                    ? [
                          name,
                          content.capabilities.filter((cap) =>
                              !dst.data[name].capabilities.includes(cap)
                          ),
                          dst.data[name].capabilities.filter((cap) =>
                              !content.capabilities.includes(cap)
                          ),
                          content.imported_roles.filter((cap) =>
                              !dst.data[name].imported_roles.includes(cap)
                          ),
                          dst.data[name].imported_roles.filter((cap) =>
                              !content.imported_roles.includes(cap)
                          ),
                      ]
                    : [name, content.capabilities, [], content.imported_roles, []]
            );
    }, [src.data, dst.data]);

    console.log(roles);

    return (
        <div>
            <P>Roles</P>
            <Heading level={2}>Step {step}.1 - Copy Roles</Heading>
            <Table>
                <Table.Head>
                    <Table.HeadCell>Role</Table.HeadCell>
                    <Table.HeadCell>Capabilities</Table.HeadCell>
                    <Table.HeadCell>Inheritance</Table.HeadCell>
                    <Table.HeadCell>Action</Table.HeadCell>
                </Table.Head>
                <Table.Body>
                    {roles.map(([name, capabilities_added, capabilities_removed, inheritance_added, inheritance_removed]) => (
                        <Table.Row key={name}>
                            <Table.Cell>{name}</Table.Cell>
                            <Table.Cell>
                                {!!capabilities_added.length && <Typography as="pre" variant="monoSmallBody" color="active">
                                    + {capabilities_added.join('\n+ ')}
                                </Typography>}
                                {!!capabilities_removed.length && <Typography as="pre" variant="monoSmallBody" color="disabled">
                                    - {capabilities_removed.join('\n- ')}
                                </Typography>}
                            </Table.Cell>
                            <Table.Cell>
                                {!!inheritance_added.length && <Typography as="pre" variant="monoSmallBody" color="active">
                                    + {inheritance_added.join('\n+ ')}
                                </Typography>}
                                {!!inheritance_removed.length && <Typography as="pre" variant="monoSmallBody" color="disabled">
                                    - {inheritance_removed.join('\n- ')}
                                </Typography>}
                            </Table.Cell>
                            <Table.Cell>
                                <CreateButton
                                config={config}
                                    target={name}
                                    label={dst ? 'Overwrite' : 'Create'}
                                />
                            </Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table>
        </div>
    );
};
