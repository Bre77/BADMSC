import P from "@splunk/react-ui/Paragraph";
import React from "react";
import Header from "../components/Header";
import { Page } from "../shared/page";

const Root = () => {
    return (
        <>
            <Header title="As Built" prev="data" />
            <P>Your Done!</P>
        </>
    );
};

Page(<Root />);
