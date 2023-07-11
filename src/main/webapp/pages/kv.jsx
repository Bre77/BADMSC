import Heading from "@splunk/react-ui/Heading";
import P from "@splunk/react-ui/Paragraph";
import React from "react";
import Conf from "../components/Confs";
import Header from "../components/Header";
import Lookup from "../components/Lookup";
import { Page } from "../shared/page";

const Root = () => {
    return (
        <>
            <Header title="KV Lookups" prev="csv" next="data" />
            <P>
                KV Store are special lookups that leverage MongoDB. They are defined by collections which have no scope, but are dependant on lookup definitions
                defined in transforms.conf to be useful at search time, which you should have already copied at the appropriate scope.
            </P>
            <Heading level={2}>Copy Collections</Heading>
            <Conf files={["collections"]} />
            <Heading level={2}>Copy KV Store data</Heading>
            <Lookup type="kv" />
        </>
    );
};
Page(<Root />);
