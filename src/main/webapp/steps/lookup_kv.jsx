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
            <P>
                KV Store are special lookups that leverage MongoDB. They are defined by collections which have no scope, but are dependant on lookup definitions
                defined in transforms.conf to be useful at search time, which you should have already copied at the appropriate scope.
            </P>
            <Heading level={2}>Step {step}.1 - Copy Collections</Heading>
            <Conf scope="system" config={config} files={["collections"]} />
            <Heading level={2}>Step {step}.2 - Copy KV Store data</Heading>
            <Lookup config={config} type="kv" path="servicesNS/nobody/-/storage/collections/config" mutationFn={mutation} />
        </div>
    );
};
