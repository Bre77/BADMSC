import P from "@splunk/react-ui/Paragraph";
import { splunkdPath } from "@splunk/splunk-utils/config";
import { defaultFetchInit } from "@splunk/splunk-utils/fetch";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import Header from "../components/Header";
import { Page } from "../shared/page";

const Root = () => {
    const asBuilt = useQuery({
        queryKey: ["asBuilt"],
        queryFn: ({ signal }) => fetch(`${splunkdPath}/services/badmsc/asbuilt?output_mode=json`, { ...defaultFetchInit, signal }),
    }).data;
    return (
        <>
            <Header title="As Built" prev="data" />
            <P>Your Done!</P>
            <P>{JSON.stringify(asBuilt)}</P>
        </>
    );
};

Page(<Root />);
