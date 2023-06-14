import Heading from "@splunk/react-ui/Heading";
import P from "@splunk/react-ui/Paragraph";
import React from "react";
import Lookup from "../components/Lookup";
import { request } from "../shared/fetch";
import { handle } from "../shared/hooks";

export default ({ step, config }) => {
    const mutation = (contents, app, file) =>
        request({
            url: `${config.dst.api}/servicesNS/nobody/lookup_editor/data/lookup_edit/lookup_contents`,
            method: "POST",
            headers: {
                Authorization: `Bearer ${config.dst.token}`,
            },
            data: {
                lookup_file: file,
                namespace: app,
                contents: JSON.stringify(contents),
            },
        })
            .then(() =>
                request({
                    url: `${config.dst.api}/servicesNS/nobody/${app}/data/lookup-table-files/${file}/acl`,
                    method: "GET",
                    params: { output_mode: "json" },
                    headers: {
                        Authorization: `Bearer ${config.dst.token}`,
                    },
                })
            )
            .then(handle);
    /*.then((data) => {
            let acl = data.entry[0].acl;
        })*/

    return (
        <div>
            <P>
                Lookups are either CSV files or KV Store collections. Unfortuantely its difficult to know if a lookup is different, so you will need to use some
                disgression.
            </P>
            <Heading level={2}>Step {step}.1 - Copy CSV Lookup Files</Heading>
            <Lookup config={config} type="csv" path="servicesNS/nobody/-/data/lookup-table-files" mutationFn={mutation} />
        </div>
    );
};
