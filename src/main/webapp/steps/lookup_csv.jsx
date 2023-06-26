import Heading from "@splunk/react-ui/Heading";
import P from "@splunk/react-ui/Paragraph";
import React from "react";
import Lookup from "../components/Lookup";
import { request } from "../shared/fetch";

export default ({ step, config }) => {
    return (
        <div>
            <P>
                Lookups are either CSV files or KV Store collections. Unfortuantely its difficult to know if a lookup is different, so you will need to use some
                disgression.
            </P>
            <Heading level={2}>Step {step}.1 - Copy CSV Lookup Files</Heading>
            <Lookup config={config} type="csv" mutationFn={mutation} />
        </div>
    );
};
