import React from 'react';
import Button from '@splunk/react-ui/Button';

export default ({ mutation, label }) => (
    <Button
        appearance={
            { idle: 'default', loading: 'pill', success: 'primary', error: 'destructive' }[
                mutation.status
            ]
        }
        onClick={() => mutation.mutate()}
        label={
            { idle: label, loading: 'Running', success: 'Success', error: 'Failed' }[
                mutation.status
            ]
        }
    />
);
