import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { splunkdPath } from '@splunk/splunk-utils/config';
import { defaultFetchInit } from '@splunk/splunk-utils/fetch';
import { makeBody } from './fetch';

export const handle = (res) => (res.ok ? res.json() : Promise.reject(res.json()));
const entry = (data) => data.entry;

export const useAcs = (endpoint, parameters = { count: 0 }, options = {}, toast = false) =>
    useQuery({
        queryKey: ['acs', endpoint],
        queryFn: () =>
            fetch(
                `${splunkdPath}/services/badmsc/proxy?${new URLSearchParams({
                    to: 'acs',
                    uri: `adminconfig/v2/${endpoint}`,
                    ...parameters,
                })}`,
                {
                    ...defaultFetchInit,
                    ...options,
                }
            ).then(handle),
        staleTime: Infinity,
    });

/*export const useMutationAcs = (endpoint, postprocess) =>
    useMutation({
        mutationFn: (body) =>
            fetch(`${splunkdPath}/services/badmsc/proxy?to=acs&uri=${endpoint}`, {
                ...defaultFetchInit,
                method: 'POST',
                body: JSON.stringify(body),
            })
                .then((res) => {
                    if (!res.ok) return console.warn(res.json());
                    queryClient.invalidateQueries({
                        queryKey: ['acs', endpoint],
                    });
                    return res.json();
                })
                .then(postprocess),
    });*/

export const useApi = (
    endpoint,
    parameters = { count: 0, output_mode: 'json' },
    options = {},
    toast = false,
    postprocess = entry
) =>
    useQuery({
        queryKey: ['api', endpoint],
        queryFn: () =>
            fetch(
                `${splunkdPath}/services/badmsc/proxy?${new URLSearchParams({
                    to: 'api',
                    uri: endpoint,
                    ...parameters,
                })}`,
                {
                    ...defaultFetchInit,
                    ...options,
                }
            )
                .then(handle)
                .then(postprocess),
        staleTime: Infinity,
    });

/*export const useMutationApi = (endpoint, postprocess) =>
    useMutation({
        mutationFn: (body) =>
            fetch(`${splunkdPath}/services/badmsc/proxy?to=acs&uri=${endpoint}`, {
                ...defaultFetchInit,
                method: 'POST',
                body: makeBody(body),
            })
                .then((res) => {
                    if (!res.ok) return console.warn(res.json());
                    queryClient.invalidateQueries({
                        queryKey: ['api', endpoint],
                    });
                    return res.json();
                })
                .then(postprocess),
    });*/

export const useSrc = (
    endpoint,
    parameters = { count: '0', output_mode: 'json' },
    options = {},
    toast = false,
    postprocess = entry
) =>
    useQuery({
        queryKey: ['src', endpoint],
        queryFn: () =>
            fetch(
                `${splunkdPath}/services/badmsc/proxy?${new URLSearchParams({
                    to: 'src',
                    uri: endpoint,
                    ...parameters,
                })}`,
                {
                    ...defaultFetchInit,
                    ...options,
                }
            )
                .then(handle)
                .then(postprocess),
        staleTime: Infinity,
    });

/*export const usePassword = () =>
    useQuery({
        queryKey: ['password'],
        queryFn: () =>
            fetch(
                `${splunkdPath}/servicesNS/${username}/badmsc/storage/passwords/badmsc%3Aauth%3A?output_mode=json&count=1`
            ).then((res) =>
                res.ok
                    ? res
                          .json()
                          .then((data) => JSON.parse(data.entry[0].content.clear_password))
                          .catch(() => ({}))
                    : false
            ),
        staleTime: Infinity,
        notifyOnChangeProps: ['data'],
    });*/
