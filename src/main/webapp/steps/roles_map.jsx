import Button from "@splunk/react-ui/Button";
import Heading from "@splunk/react-ui/Heading";
import Message from "@splunk/react-ui/Message";
import P from "@splunk/react-ui/Paragraph";
import Table from "@splunk/react-ui/Table";
import { Typography } from "@splunk/react-ui/Typography";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useMemo } from "react";
import MutateButton from "../components/MutateButton";
import { request } from "../shared/fetch";
import { dedup } from "../shared/helpers";
import { handle, nameContent, useAcs, useApi, useApps } from "../shared/hooks";

const ENDPOINT = "services/authorization/roles";

export default ({ step, config }) => {
    const queryClient = useQueryClient();
    const src = useApi(config.src, ENDPOINT, nameContent);
    const dst = useApi(config.dst, ENDPOINT, nameContent);

    const isLoading = src.isLoading || dst.isLoading;

    return (
        <div>
            <Heading level={2}>Step {step}.1 - Map Roles</Heading>
            <P>x</P>
        </div>
    );
};
