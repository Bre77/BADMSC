import P from "@splunk/react-ui/Paragraph";
import Select from "@splunk/react-ui/Select";
import WaitSpinner from "@splunk/react-ui/WaitSpinner";
import React, { useContext, useMemo, useState } from "react";
import { AppConf, GlobalConf } from "../components/Conf";
import Header from "../components/Header";
import { CONF_FILES } from "../shared/const";
import { wrapSetValue } from "../shared/helpers";
import { keyContent, useApi, useConfig } from "../shared/hooks";
import { Page } from "../shared/page";

const Root = () => {
    const config = useConfig();
    const files = useApi(config.src, "services/properties", keyContent, ["data"]).data ?? [];
    const [file, setFile] = useState("props");
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
            {file && <Conf file={file} />}
        </>
    );
};

Page(<Root />);
