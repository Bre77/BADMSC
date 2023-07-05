import Heading from "@splunk/react-ui/Heading";
import P from "@splunk/react-ui/Paragraph";
import React from "react";
import Header from "../components/Header";
import UI from "../components/Ui";
import { Page } from "../shared/page";

const Root = () => {
    return (
        <>
            <Header title="Views" prev="nav" next="lookupscsv" />
            <P>Dashboards and panels are saved as views. Many come built in to apps, but users also create their own within app contexts.</P>
            <Heading level={2}>View Copy</Heading>
            <UI folder="views" />
        </>
    );
};

Page(<Root />);
