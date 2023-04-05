/* eslint-disable */

import { splunkdPath } from '@splunk/splunk-utils/config';
import { defaultFetchInit } from '@splunk/splunk-utils/fetch';

import { TOAST_TYPES } from '@splunk/react-toast-notifications/ToastConstants';
import Toaster, { makeCreateToast } from '@splunk/react-toast-notifications/Toaster';

// Helpers
const Toast = makeCreateToast(Toaster);

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
