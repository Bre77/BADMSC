/* eslint-disable */

import { splunkdPath } from '@splunk/splunk-utils/config';
import { defaultFetchInit } from '@splunk/splunk-utils/fetch';

import { TOAST_TYPES } from '@splunk/react-toast-notifications/ToastConstants';
import Toaster, { makeCreateToast } from '@splunk/react-toast-notifications/Toaster';

// Helpers
const Toast = makeCreateToast(Toaster);

const makeParameters = (parameters = []) => {
    return Object.entries(parameters)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
};
export const makeBody = (data) => {
    return Object.entries(data).reduce((form, [key, value]) => {
        form.append(key, value);
        return form;
    }, new URLSearchParams());
};

export const FETCH_INIT = {
    method: 'POST',
    credentials: defaultFetchInit.credentials,
    headers: {
        ...defaultFetchInit.headers,
        'Content-Type': 'application/json',
    },
};

export const REQUEST_URL = `${splunkdPath}/services/badmsc/request?output_mode=json`;

export const request = (body) =>
    fetch(REQUEST_URL, {
        ...FETCH_INIT,
        body: JSON.stringify(body),
    });

export const handleRes = (res) => {
    return res.status === 204
        ? Promise.resolve()
        : res.json().then((data) => {
              if (res.ok) return data;

              data.status = res.status;
              console.warn(data);
              Toast({ message: data.error_message, type: TOAST_TYPES.ERROR, autoDismiss: false });
              return Promise.reject(data.error_message);
          });
};

export async function restStatus(endpoint, parameters = {}) {
    return fetch(`${splunkdPath}/services/badmsc/${endpoint}?${makeParameters(parameters)}`, {
        ...defaultFetchInit,
        method: 'POST',
    });
}

export async function restGet(endpoint, parameters = {}) {
    return fetch(`${splunkdPath}/services/badmsc/${endpoint}?${makeParameters(parameters)}`, {
        ...defaultFetchInit,
    });
}

export async function restPostForm(endpoint, parameters = {}, body = {}) {
    return fetch(`${splunkdPath}/services/badmsc/${endpoint}?${makeParameters(parameters)}`, {
        ...defaultFetchInit,
        method: 'POST',
        body: makeBody(body),
    }).then(handleRes);
}

export async function restPostJSON(endpoint, parameters = {}, body = {}) {
    return fetch(`${splunkdPath}/services/badrcm/${endpoint}?${makeParameters(parameters)}`, {
        ...defaultFetchInit,
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
            ...defaultFetchInit.headers,
            'Content-Type': 'application/json',
        },
    }).then(handleRes);
}
