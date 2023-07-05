import Heading from "@splunk/react-ui/Heading";
import P from "@splunk/react-ui/Paragraph";
import Select from "@splunk/react-ui/Select";
import WaitSpinner from "@splunk/react-ui/WaitSpinner";
import React, { useMemo, useState } from "react";
import { GlobalConf, ScopedConf } from "../components/Conf";
import Header from "../components/Header";
import { CONF_FILES } from "../shared/const";
import { wrapSetValue } from "../shared/helpers";
import { keyContent, useApi, useConfig } from "../shared/hooks";
import { Page } from "../shared/page";

const Root = () => {
    const config = useConfig();
    const files = useApi(config.src, "services/properties", keyContent, ["data"]).data ?? [];
    const [file, setFile] = useState(window.location.href.split("-").pop());
    const handleFile = wrapSetValue(setFile);

    return (
        <>
            <Header title="Config" prev="users" next="parsing" />
            <P>This is the bulk of the work</P>
            <Select inline value={file} onChange={handleFile} style={{ width: "20em" }}>
                <Select.Heading>Important Files</Select.Heading>
                {CONF_FILES.map((file) => (
                    <Select.Option value={file} label={file} key={file} />
                ))}
                <Select.Divider />
                <Select.Heading>All Files (Only If Required)</Select.Heading>
                {files.map((file) => (
                    <Select.Option value={file} label={file} key={file} />
                ))}
            </Select>
            <br />
            <br />
            {file && (
                <>
                    <Heading level={2}>Global Scope Config</Heading>
                    <GlobalConf file={file} />
                    <Heading level={2}>App Scope Config</Heading>
                    <ScopedConf file={file} />
                </>
            )}
        </>
    );
};

Page(<Root />);
