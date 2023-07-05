import P from "@splunk/react-ui/Paragraph";
import React from "react";
import Header from "../components/Header";
import { Config, Page } from "../shared/page";

export default () => {
    return (
        <>
            <Header title="As Built" prev="data" />
            <P>Your Done!</P>
        </>
    );
};
