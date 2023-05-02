import React from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { splunkdPath, username } from '@splunk/splunk-utils/config';
import { defaultFetchInit } from '@splunk/splunk-utils/fetch';
import { request } from './fetch';
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

        notifyOnChangeProps: ['data'],
    });

export const useApi = (target, path, postprocess = entry, staleTime = Infinity) =>
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

export const useApps = (target) =>
    // useApps is called in multiple steps, so is defined once for consistency
    useApi(target, 'services/apps/local', (data) =>
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
    });

export const processConfs = (data) =>
    data.entry.reduce((x, { name, acl, content }) => {
        x[acl.app] ||= {};
        x[acl.app][name] = {
            sharing: acl.sharing,
            perms: acl.perms,
            owner: acl.owner,
            content,
        };
        return x;
    }, {});

export const useConfs = (target, files = CONF_FILES) =>
    useQueries({
        queries: files.map((file) => ({
            queryKey: [target.key, 'config', file],
            queryFn: () =>
                request({
                    url: `${target.api}/servicesNS/nobody/-/configs/conf-${file}`,
                    method: 'GET',
                    params: { output_mode: 'json', count: -1 },
                    headers: {
                        Authorization: `Bearer ${target.token}`,
                    },
                })
                    .then(handle)
                    .then(processConfs),
        })),
    });

export const useDefaults = (target, files = CONF_FILES) =>
    useQueries({
        queries: files.map((file) => ({
            queryKey: [target.key, 'default', file],
            queryFn: () =>
                request({
                    url: `${target.api}/services/properties/${file}/default`,
                    method: 'GET',
                    params: { output_mode: 'json', count: -1 },
                    headers: {
                        Authorization: `Bearer ${target.token}`,
                    },
                })
                    .then(handle)
                    .then((data) =>
                        data.entry.reduce((x, { name, content }) => {
                            x[name] = content;
                            return x;
                        }, {})
                    )
                    .catch(() => ({})),
        })),
    });
