import React, { useReducer } from 'react';

// Splunk UI

export const isort = (a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }); // Case insensitive sort
export const isort0 = (a, b) => a[0].localeCompare(b[0], undefined, { sensitivity: 'base' });
export const isort1 = (a, b) => a[1].localeCompare(b[1], undefined, { sensitivity: 'base' });
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

export const wrapSetValue =
    (f) =>
    (_, { value }) =>
        f(value);

export const latest = (results) =>
    results.reduce((x, { dataUpdatedAt }) => Math.max(x, dataUpdatedAt), 0);
