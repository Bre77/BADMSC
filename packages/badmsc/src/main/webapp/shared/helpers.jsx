import React, { useReducer, useState } from 'react';
import { splunkdPath, username } from '@splunk/splunk-utils/config';
import { defaultFetchInit } from '@splunk/splunk-utils/fetch';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { restStatus, restPostForm } from './fetch';
import WaitSpinner from '@splunk/react-ui/WaitSpinner';
import Success from '@splunk/react-icons/Success';
import Error from '@splunk/react-icons/Error';

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

export const StatusCheck = ({ host }) => {
    console.log(host);
    const { data, isLoading } = useQuery({
        queryKey: ['status', host],
        queryFn: () => restStatus('proxy', { method: 'OPTIONS', host }),
        staleTime: 'Infinity',
    });
    console.log(data);
    return isLoading ? <WaitSpinner /> : data < 300 ? <Success /> : <Error />;
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
