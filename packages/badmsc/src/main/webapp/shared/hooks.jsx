import React from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { splunkdPath, username } from '@splunk/splunk-utils/config';
import { defaultFetchInit } from '@splunk/splunk-utils/fetch';
import { makeBody, request } from './fetch';
import { CONF_FILES } from './const';

export const LOCAL_URL = `${splunkdPath}/servicesNS/${username}/badmsc`;

export const handle = (res) => (res.ok ? res.json() : Promise.reject(res.text()));
const entry = (data) => data.entry;

export const useConfig = () =>
    useQuery({
        queryKey: ['config'],
        queryFn: () =>
            fetch(
                `${LOCAL_URL}/storage/passwords/badmsc%3Aauth%3A?output_mode=json&count=1`,
                defaultFetchInit
            ).then((res) => {
                if (res.status === 404) {
                    return false;
                }
                if (res.status === 200) {
                    return res
                        .json()
                        .then((data) => JSON.parse(data.entry[0].content.clear_password))
                        .then((config) => {
                            config.src.key = 'src';
                            config.dst.key = 'dst';
                            return config;
                        })
                        .catch(() => Promise.reject());
                }
                return Promise.reject();
            }),
        staleTime: Infinity,
        notifyOnChangeProps: ['data'],
    });

export const useGetApi = (target, path, postprocess = entry, staleTime = Infinity) =>
    useQuery({
        queryKey: [target.key, path],
        queryFn: () =>
            request({
                url: `${target.api}/${path}`,
                method: 'GET',
                params: { output_mode: 'json', count: -1 },
                headers: {
                    Authorization: `Bearer ${target.token}`,
                },
            })
                .then(handle)
                .then(postprocess),
        enabled: !!target,
        staleTime,
    });

/*export const usePostApi = (target, path, postprocess = entry) =>
    useQuery({
        queryKey: [target.key, path],
        queryFn: () =>
            request({
                url: `${target.api}/${path}`,
                method: 'GET',
                params: { output_mode: 'json', count: -1 },
                headers: {
                    Authorization: `Bearer ${target.token}`,
                },
            })
                .then(handle)
                .then(postprocess),
        enabled: !!target,
        staleTime: Infinity,
    });*/

export const useApps = (target) =>
    // useApps is called in multiple steps, so is defined one for consistency
    useGetApi(target, 'services/apps/local', (data) =>
        Object.fromEntries(data.entry.map((app) => [app.name, app]))
    );

export const useAcs = (target, endpoint) =>
    useQuery({
        queryKey: ['acs', endpoint],
        queryFn: () =>
            request({
                url: `${target.acs}/adminconfig/v2/${endpoint}`,
                method: 'GET',
                params: { count: 0 },
                headers: {
                    Authorization: `Bearer ${target.token}`,
                },
            }).then(handle),
        enabled: !!target,
        staleTime: Infinity,
    });
