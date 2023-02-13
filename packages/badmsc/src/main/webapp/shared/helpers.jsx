import React, { useReducer, useState } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { restStatus, restPostForm } from './fetch';

// Splunk UI
import Tooltip from '@splunk/react-ui/Tooltip';
import WaitSpinner from '@splunk/react-ui/WaitSpinner';
import Success from '@splunk/react-icons/Success';
import Error from '@splunk/react-icons/Error';
import NotAllowed from '@splunk/react-icons/NotAllowed';
import { splunkdPath } from '@splunk/splunk-utils/config';
import { defaultFetchInit } from '@splunk/splunk-utils/fetch';

export const isort = (a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }); // Case insensitive sort
export const isort0 = (a, b) => a[0].localeCompare(b[0], undefined, { sensitivity: "base" });
export const isort1 = (a, b) => a[1].localeCompare(b[1], undefined, { sensitivity: "base" });
export const dedup = (a) => Array.from(new Set(a));

// Local Storage
export const localSave = (key, value) => window.localStorage.setItem(key, JSON.stringify(value));

export const localLoad = (key, fallback = null) => {
    try {
        const value = JSON.parse(window.localStorage.getItem(key));
        return value !== null ? value : fallback;
    } catch {
        return fallback;
    }
};

export const useLocal = (key, fallback) => {
    return useReducer((prev, value) => {
        value === null
            ? window.localStorage.removeItem(key)
            : window.localStorage.setItem(key, JSON.stringify(value));
        return value;
    }, localLoad(key, fallback));
};

export const wrapSetValue =
    (f) =>
    (_, { value }) =>
        f(value);

export const StatusCheck = ({ host, disabled }) => {
    const { data, isLoading } = useQuery({
        queryKey: ['status', host],
        queryFn: () =>
            fetch(`${splunkdPath}/services/badmsc/check?host=${host}`, defaultFetchInit).then(
                (res) => res.text()
            ),
        staleTime: Infinity,
        enabled: !disabled,
    });
    if (disabled) return <NotAllowed />;
    if (isLoading) return <WaitSpinner />;
    if (data == 'OK') return <Success />;
    return (
        <Tooltip content={data}>
            <Error />
        </Tooltip>
    );
};

export const AuthCheck = (host, uri) => {
    const { data, isLoading } = useQuery({
        queryKey: ['auth', host],
        queryFn: () => restPostForm('proxy', { method: 'GET', host, uri }),
        staleTime: 60000,
    });
    console.log(data);
    return isLoading ? <WaitSpinner /> : data < 300 ? <Success /> : <Error />;
};
