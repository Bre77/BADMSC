import Error from "@splunk/react-icons/Error";
import NotAllowed from "@splunk/react-icons/NotAllowed";
import Success from "@splunk/react-icons/Success";
import ControlGroup from "@splunk/react-ui/ControlGroup";
import Heading from "@splunk/react-ui/Heading";
import List from "@splunk/react-ui/List";
import Message from "@splunk/react-ui/Message";
import P from "@splunk/react-ui/Paragraph";
import Text from "@splunk/react-ui/Text";
import Tooltip from "@splunk/react-ui/Tooltip";
import WaitSpinner from "@splunk/react-ui/WaitSpinner";
import { splunkdPath } from "@splunk/splunk-utils/config";
import { defaultFetchInit } from "@splunk/splunk-utils/fetch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useContext, useEffect, useReducer, useState } from "react";
import Header from "../components/Header";
import MutateButton from "../components/MutateButton";
import { makeBody, request } from "../shared/fetch";
import { wrapSetValue } from "../shared/helpers";
import { handle } from "../shared/hooks";
import { Config, Page } from "../shared/page";

const StatusCheck = ({ host, disabled, method = "GET" }) => {
    const { data, isLoading } = useQuery({
        queryKey: ["check", host],
        queryFn: ({ signal }) =>
            request(
                {
                    url: `https://${host}`,
                    method,
                },
                signal
            ).then((res) => res.ok || res.status == 401 || res.statusText || res.status),

        enabled: !disabled,
    });
    if (disabled) return <NotAllowed />;
    if (isLoading) return <WaitSpinner />;
    if (data === true) return <Success />;
    console.info(host, data);
    return (
        <Tooltip content={data}>
            <Error />
        </Tooltip>
    );
};

const dropHTTPS = (prev, stack) => stack.replace("https://", "");

const e = (query) => (query.isError ? query.error : false);

const Auth = () => {
    const config = useContext(Config);

    const [src_api, setSrcApi] = useReducer(dropHTTPS, "");
    const handleSrcApi = wrapSetValue(setSrcApi);
    const [src_token, setSrcToken] = useState("");
    const handleSrcToken = wrapSetValue(setSrcToken);
    const src_test = useMutation(() =>
        request({
            url: `${src_api}/services`,
            method: "GET",
            headers: { Authorization: `Bearer ${src_token}` },
        }).then((res) => (res.ok ? Promise.resolve() : Promise.reject()))
    );

    const [dst_sh, setDstSh] = useReducer(dropHTTPS, "");
    const handleDstSh = wrapSetValue(setDstSh);
    const [dst_api, setDstApi] = useReducer(dropHTTPS, "");
    const handleDstApi = wrapSetValue(setDstApi);
    const [dst_hec, setDstHec] = useReducer(dropHTTPS, "");
    const handleDstHec = wrapSetValue(setDstHec);
    const [dst_acs, setDstAcs] = useReducer(dropHTTPS, "");
    const handleDstAcs = wrapSetValue(setDstAcs);
    const [dst_token, setDstToken] = useState("");
    const handleDstToken = wrapSetValue(setDstToken);

    const dst_test = useMutation(() =>
        request({
            url: `${dst_acs}/adminconfig/v2`,
            method: "GET",
            headers: { Authorization: `Bearer ${dst_token}` },
        }).then(handle)
    );

    const stack_valid = dst_sh.endsWith(".splunkcloud.com");

    useEffect(() => {
        if (stack_valid) {
            setDstApi(`${dst_sh}:8089`);
            if (!config?.dst?.acs) setDstAcs(`admin.splunk.com/${dst_sh.replace(/^(es-|itsi-)/, "").replace(".splunkcloud.com", "")}`);
            if (!config?.dst?.hec) setDstHec(`http-inputs-${dst_sh.replace(/^(es-|itsi-)/, "")}:443`);
        }
    }, [dst_sh]);

    useEffect(() => {
        if (config?.src?.api) setSrcApi(config.src.api);
        if (config?.src?.token) setSrcToken(config.src.token);

        if (config?.dst?.sh) setDstSh(config.dst.sh);
        if (config?.dst?.token) setDstToken(config.dst.token);
        if (config?.dst?.api) setDstApi(config.dst.api);
        if (config?.dst?.acs) setDstAcs(config.dst.acs);
        if (config?.dst?.hec) setDstHec(config.dst.hec);
    }, [config]);

    const mutatePassword = useMutation({
        mutationFn: () => {
            const payload = JSON.stringify({
                src: { api: src_api, token: src_token },
                dst: {
                    sh: dst_sh,
                    token: dst_token,
                    api: dst_api,
                    acs: dst_acs,
                },
            });
            return (
                config
                    ? fetch(`${splunkdPath}/servicesNS/nobody/badmsc/storage/passwords/badmsc%3Aauth%3A?output_mode=json`, {
                          ...defaultFetchInit,
                          method: "POST",
                          body: makeBody({
                              password: payload,
                          }),
                      })
                    : fetch(`${splunkdPath}/servicesNS/nobody/badmsc/storage/passwords?output_mode=json`, {
                          ...defaultFetchInit,
                          method: "POST",
                          body: makeBody({
                              realm: "badmsc",
                              name: "auth",
                              password: payload,
                          }),
                      })
            ).then((res) => {
                if (!res.ok) return console.warn(res.text());
                location.reload();
            });
        },
    });

    return (
        <>
            <Header title="Authentication" prev="start" next="ipallow" />
            <P>
                Setup access to both your source system and the target Splunk Cloud stack. Ideally you should be running this tool on the Splunk system you want
                to migrate, however if that system does not have a Web UI or is otherwise inaccessible you can set it as the source below.
            </P>
            <Message appearance="fill" type="info">
                Do not include https:// in any inputs. HTTPS is mandatory for all communication and will be automatically enforced.
            </Message>
            <Heading level={2}>Source System</Heading>
            <P>Please enter the REST API endpoint and authentication token for the source Splunk system. Leave blank to use the current system.</P>
            <ControlGroup label="REST API" labelWidth={90} help="Exclude Protocol, include port. Leave blank to use this server">
                <Text value={src_api} onChange={handleSrcApi} placeholder="localhost:8089" />
            </ControlGroup>
            <ControlGroup label="Auth Token" labelWidth={90} help="User should have admin role. Leave blank to use your user">
                <Text value={src_token} error={src_api !== "" && src_token.length < 100} onChange={handleSrcToken} passwordVisibilityToggle />
                <MutateButton mutation={src_test} label="Test" />
            </ControlGroup>
            <Heading level={2}>Splunk Cloud</Heading>
            <P>
                Please enter the domain name of the Splunk Cloud search head you want to migrate configuration to. This will be forced to use HTTPS and port
                8089.
            </P>
            <ControlGroup label="Search Head" labelWidth={90} help="Excluded Protocol and port">
                <Text value={dst_sh} onChange={handleDstSh} placeholder="customer.splunkcloud.com" error={!stack_valid} />
            </ControlGroup>
            <ControlGroup label="REST API" labelWidth={90} help="Exclude protocol, include port">
                <Text value={dst_api} onChange={handleDstApi} placeholder="customer.splunkcloud:8089" disabled={dst_sh == ""} />
            </ControlGroup>
            <ControlGroup label="HEC" labelWidth={90} help="Exclude protocol, include port">
                <Text value={dst_hec} onChange={handleDstHec} placeholder="http-inputs-customer.splunkcloud:8089" disabled={dst_sh == ""} />
            </ControlGroup>
            <ControlGroup label="ACS" labelWidth={90} help="Exclude protocol and trailing slash">
                <Text value={dst_acs} onChange={handleDstAcs} placeholder="admin.splunk.com/customer" disabled={dst_sh == ""} />
            </ControlGroup>
            <ControlGroup label="Auth Token" labelWidth={90} help="User must have sc_admin role">
                <Text inline value={dst_token} onChange={handleDstToken} error={dst_token.length < 100} disabled={dst_sh == ""} passwordVisibilityToggle />
                <MutateButton mutation={dst_test} label="Test" />
            </ControlGroup>
            <Heading level={2}>Save</Heading>
            <P>Save all the details above into an encrypted passwords.conf entry.</P>
            <MutateButton mutation={mutatePassword} label="Save" />
            <Heading level={2}>External Access Check</Heading>
            <P>
                To perform the migration, this Search Head will also access the following domains using HTTPS. If these checks fail, either the stack name is
                incorrect or your proxy/firewall rules are preventing access.
            </P>
            <List>
                <List.Item>
                    <StatusCheck host="api.splunk.com" /> api.splunk.com
                </List.Item>
                <List.Item>
                    <StatusCheck host="splunkbase.splunk.com" method="OPTIONS" /> splunkbase.splunk.com
                </List.Item>
                <List.Item>
                    <StatusCheck host="api.ipify.org" /> api.ipify.org (optional)
                </List.Item>
            </List>
        </>
    );
};

Page(<Auth />);
