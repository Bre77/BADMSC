import Heading from "@splunk/react-ui/Heading";
import P from "@splunk/react-ui/Paragraph";
import React from "react";
import Header from "../components/Header";
import UI from "../components/Ui";
import { Page } from "../shared/page";

const Root = () => {
    return (
        <>
            <Header title="Navigration" prev="config" next="views" />
            <P>Apps can contain customised navigation menus, in this step we will copy those over as required.</P>
            <Heading level={2}>Navigation Copy</Heading>
            <UI folder="nav" />
        </>
    );
};

Page(<Root />);
