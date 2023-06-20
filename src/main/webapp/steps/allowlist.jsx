import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import { useAcs, useApi, useConfig } from "../shared/hooks";

// Splunk UI
import Button from "@splunk/react-ui/Button";
import ControlGroup from "@splunk/react-ui/ControlGroup";
import Heading from "@splunk/react-ui/Heading";
import Link from "@splunk/react-ui/Link";
import List from "@splunk/react-ui/List";
import Message from "@splunk/react-ui/Message";
import P from "@splunk/react-ui/Paragraph";
import Text from "@splunk/react-ui/Text";
import WaitSpinner from "@splunk/react-ui/WaitSpinner";
import { splunkdPath } from "@splunk/splunk-utils/config";
import { defaultFetchInit } from "@splunk/splunk-utils/fetch";
import { request } from "../shared/fetch";
import { wrapSetValue } from "../shared/helpers";

const Allowlist = ({ feature, config }) => {
    const query = useAcs(config.dst, `access/${feature}/ipallowlists`);
    return query.isLoading ? (
        <WaitSpinner />
    ) : (
        <List>
            {query.data?.subnets.length ? (
                query.data.subnets.map((subnet) => <List.Item key={subnet}>{subnet}</List.Item>)
            ) : (
                <List.Item>
                    <b>There are no subnets on this allow list</b>
                </List.Item>
            )}
        </List>
    );
};

const AddAllow = ({ suggestion, feature, config }) => {
    const queryClient = useQueryClient();

    const [subnet, setSubnet] = useState("");
    const handleSubnet = wrapSetValue(setSubnet);
    useEffect(() => {
        if (!subnet && suggestion) setSubnet(`${suggestion}/32`);
    }, [suggestion]);

    const addIp = useMutation({
        mutationFn: () =>
            request({
                url: `${config.dst.acs}/adminconfig/v2/access/${feature}/ipallowlists`,
                method: "POST",
                headers: {
                    Authorization: `Bearer ${config.dst.token}`,
                },
                json: { subnets: [subnet] },
            }).then((res) => {
                if (!res.ok) return console.warn(res.json());
                queryClient.invalidateQueries({
                    queryKey: ["acs", `access/${feature}/ipallowlists`],
                });
                if (feature == "search-api")
                    queryClient.invalidateQueries({
                        queryKey: ["dst", "services/admin/server-info"],
                    });
                setSubnet("");
            }),
    });
    return (
        <ControlGroup label="Add Subnet">
            <Text value={subnet} onChange={handleSubnet} placeholder="0.0.0.0/32" />
            <Button disabled={!subnet.match(/^[\da-f:.]+\/\d{1,2}$/i)} onClick={() => addIp.mutate()}>
                Add
            </Button>
        </ControlGroup>
    );
};

export default ({ step, config }) => {
    const test = useApi(config.dst, "services/admin/server-info", () => true);

    const sh_ip = useQuery({
        queryKey: ["wanip", "sh"],
        queryFn: ({ signal }) =>
            request({ url: "https://api.ipify.org/", method: "GET" }, signal).then((res) => (res.ok ? res.text() : Promise.reject(res.status))),
    });
    const user_ip = useQuery({
        queryKey: ["wanip", "user"],
        queryFn: ({ signal }) => fetch("https://api.ipify.org/", { signal }).then((res) => (res.ok ? res.text() : Promise.reject(res.status))),
    });

    return (
        <div>
            <P>
                To enable access to the Splunk Rest API in Splunk Cloud, the internet facing IP address of this search head, or of the network path it uses,
                must be added to the allow list. These can all be modified on your Splunk Cloud Search Head under
                <b> Settings > Server Settings > IP allow list</b>.
            </P>

            <Heading level={2}>Step {step}.1 - Review Search Head API Allowlist</Heading>
            <P>This is the list of IP subnets currently allowed to access the Search Head API</P>
            <Allowlist feature="search-api" config={config} />
            <P>
                The internet facing IP address of this Search Head is <b>{(sh_ip.isSuccess && sh_ip.data) || "unknown"}</b>.
            </P>
            <AddAllow suggestion={sh_ip.data} feature="search-api" config={config} />
            <Heading level={2}>Step {step}.2 - Review Search Head UI Allowlist</Heading>
            <P>This is the list of IP subnets currently allowed to access the Search Head Web UI</P>
            <Allowlist feature="search-ui" config={config} />
            <P>
                The internet facing IP address of your computer is <b>{(user_ip.isSuccess && user_ip.data) || "unknown"}</b>.
            </P>
            <AddAllow suggestion={user_ip.data} feature="search-ui" config={config} />
            <Heading level={2}>Step {step}.3 - Review Splunk to Splunk (data forwarding) Allowlist</Heading>
            <P>This is the full list of IP subnets allowed to send data to Splunk Cloud</P>

            <Allowlist feature="s2s" config={config} />
            <P>If you know the internet facing IP addresses required for Splunk data forwarding, you can add them below.</P>
            <AddAllow feature="s2s" config={config} />
            <Heading level={2}>Step {step}.4 - Required Access</Heading>
            <P>
                This App will need access to the Splunk Cloud Search Head API. If this following test fails you will need to modify the Search Head API allow
                list and wait a few minutes.
            </P>

            {test.fetchStatus == "fetching" ? (
                <Message appearance="fill" type="info">
                    Testing connection to the Splunk Cloud Search Head REST API
                </Message>
            ) : test.isSuccess ? (
                <Message appearance="fill" type="success">
                    Successfully connected to the Splunk Cloud Search Head REST API
                </Message>
            ) : (
                <Message appearance="fill" type="error">
                    Failed to connect to the Splunk Cloud Search Head REST API. <Link onClick={() => test.refetch()}>Click here to try again.</Link>
                </Message>
            )}
        </div>
    );
};
