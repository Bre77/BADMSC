import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useMemo } from "react";
import Conf from "../components/conf";
import Lookup, { LookupCompare, OpenLookup } from "../components/lookup";
import { isort0, wrapSetValue } from "../shared/helpers";
import { handle, useApi, useApps } from "../shared/hooks";

// Splunk UI
import Heading from "@splunk/react-ui/Heading";
import P from "@splunk/react-ui/Paragraph";
import WaitSpinner from "@splunk/react-ui/WaitSpinner";
import { request } from "../shared/fetch";

export default ({ step, config }) => {
    const mutation = (contents, app, file) =>
        request({
            url: `${config.dst.api}/servicesNS/nobody/-/storage/collections/data/${file}/batch_save`,
            method: "POST",
            headers: {
                Authorization: `Bearer ${config.dst.token}`,
                "Content-Type": "application/json",
            },
            json: contents.slice(1).map((row) => Object.fromEntries(contents[0].map((e, i) => [e, row[i]]))),
        })
            .then(() =>
                request({
                    url: `${config.dst.api}/servicesNS/nobody/${app}/storage/collections/${file}/acl`,
                    method: "GET",
                    params: { output_mode: "json" },
                    headers: {
                        Authorization: `Bearer ${config.dst.token}`,
                    },
                })
            )
            .then(handle);

    return (
        <div>
            <P>Modular Inputs</P>
            <Heading level={2}>Step {step}.1 - Copy Inputs</Heading>
            <Conf config={config} files={["inputs"]} />
            <Heading level={2}>Step {step}.2 - Copy Passwords</Heading>
            <Conf config={config} files={["passwords"]} />
        </div>
    );
};
