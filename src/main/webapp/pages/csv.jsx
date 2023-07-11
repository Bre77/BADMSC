import Heading from "@splunk/react-ui/Heading";
import P from "@splunk/react-ui/Paragraph";
import React from "react";
import Header from "../components/Header";
import Lookup from "../components/Lookup";
import { Page } from "../shared/page";

const Root = () => {
    return (
        <>
            <Header title="CSV Lookups" prev="views" next="kv" />
            <P>Its difficult to know if a lookup is different, so you will need to use some disgression.</P>
            <Heading level={2}>Copy CSV Lookup Files</Heading>
            <Lookup type="csv" />
        </>
    );
};

Page(<Root />);
