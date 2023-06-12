import Heading from "@splunk/react-ui/Heading";
import Multiselect from "@splunk/react-ui/Multiselect";
import P from "@splunk/react-ui/Paragraph";
import Table from "@splunk/react-ui/Table";
import WaitSpinner from "@splunk/react-ui/WaitSpinner";
import React, { useEffect, useMemo } from "react";
import Conf from "../components/conf";
import MutateButton from "../components/mutateButton";
import { request } from "../shared/fetch";
import { handle, processConfs, useApi, useLocal } from "../shared/hooks";

const STANDARD_CONF_FILES = [
    "addon_builder",
    "alert_actions",
    "alerts",
    "app",
    "assist",
    "authentication",
    "authorize",
    "checklist",
    "collections",
    "commands",
    "conf",
    "config_explorer",
    "datamodels",
    "datatypesbnf",
    "default-mode",
    "deploymentclient",
    "distsearch",
    "dmc_alerts",
    "event_renderers",
    "eventdiscoverer",
    "eventtypes",
    "federated",
    "fields",
    "gdi_settings",
    "global-banner",
    "health",
    "html",
    "indexes",
    "inputs",
    "launcher",
    "limits",
    "livetail",
    "lookups",
    "macros",
    "manager",
    "managed_configurations",
    "messages",
    "metric_alerts",
    "metric_rollups",
    "migration",
    "models",
    "multikv",
    "nav",
    "outputs",
    "passwords",
    "procmon-filters",
    "props",
    "rapid_diag",
    "restmap",
    "savedsearches",
    "searchbnf",
    "searchscripts",
    "securegateway",
    "segmenters",
    "server",
    "serverclass",
    "source-classifier",
    "sourcetypes",
    "splunk_create",
    "splunk_monitoring_console_assets",
    "splunkar",
    "tags",
    "telemetry",
    "times",
    "transactiontypes",
    "transforms",
    "ui-prefs",
    "ui-tour",
    "user-prefs",
    "views",
    "viewstates",
    "visualizations",
    "web",
    "web-features",
    "workflow_actions",
    "workload_policy",
    "workload_pools",
    "workload_rules",
    "workspace",
    "wmi",
];
const MODINPUT_CONF_FILES = [
    "aws_account_ext",
    "aws_cloudtrail",
    "aws_cloudwatch_logs",
    "aws_config_rule",
    "aws_config_rule_tasks",
    "aws_description",
    "aws_global_settings",
    "aws_inspector",
    "aws_inspector_tasks",
    "aws_inspector_v2",
    "aws_kinesis",
    "aws_metadata",
    "aws_settings",
    "aws_sqs",
    "ep_aws_s3",
    "ta_pihole_dns_account",
    "ta_pihole_dns_settings",
    "ep_aws_s3",
    "ep_azure_blob",
    "ep_box",
    "ep_general",
    "ep_hec",
    "ep_sftp",
    "ep_smb",
    "mscs_api_settings",
    "splunk_ta_ms_security_account",
    "splunk_ta_ms_security_settings",
    "splunk_ta_mscs_settings",
    "splunk_ta_nginx_settings", //unsure
    "splunk_ta_o365_endpoints",
    "splunk_ta_o365_settings",
    "splunk_ta_o365_tenants",
    "splunk_ta_paloalto_settings", //unsure
    "splunk_ta_tomcat_settings", //unsure
    "ta_flashpoint_intelligence_account",
    "ta_flashpoint_intelligence_settings",
    "ta_mandiant_advantage_account",
    "ta_mandiant_advantage_settings",
    "ta_microsoft_graph_security_add_on_for_splunk_account",
    "ta_microsoft_graph_security_add_on_for_splunk_settings",
    "ta_ms_aad_account",
    "ta_ms_aad_settings",
    "ta_ms_o365_reporting_account",
    "ta_ms_o365_reporting_settings",
    "ta_tenable_account",
    "ta_tenable_settings",
    "ta_virustotal_app_settings",
    "ta_webtools_settings",
    "ta_zscaler_cim_settings",
    "virustotal",
];

export default ({ step, config }) => {
    return (
        <>
            <P>Modular Inputs</P>
            <Heading level={2}>Step {step}.1 - Copy App Specific Account Configuration</Heading>
            <P>Select any modular input configuration files that need to be migrated</P>
            <ModInputs config={config} />
            <Heading level={2}>Step {step}.2 - Copy Passwords</Heading>
            <Passwords config={config} />
            <Heading level={2}>Step {step}.3 - Copy Inputs</Heading>
            <P>Be sure to ignore and SplunkTCP or HTTP inputs here, only modular inputs should be migrated.</P>
            <Conf config={config} files={["inputs"]} />
        </>
    );
};

const ModInputs = ({ config }) => {
    const [files, setFiles] = useLocal(`badmsc_extra_files-${config.src.api}`, MODINPUT_CONF_FILES);
    const handleFiles = (e, { values }) => setFiles(values);
    const src_files = useApi(config.src, "services/properties", (data) => data.entry.map((e) => e.name).filter((f) => !STANDARD_CONF_FILES.includes(f)));
    useEffect(() => {
        if (src_files.data) {
            setFiles([...files.filter((f) => src_files.data.includes(f))]);
        }
    }, [src_files.data]);
    return (
        <>
            <Multiselect values={files} onChange={handleFiles} options={src_files.data} disabled={src_files.isLoading}>
                {src_files.data?.map((file) => (
                    <Multiselect.Option key={file} label={file} value={file} />
                ))}
            </Multiselect>
            {src_files.isLoading ? <WaitSpinner size="large" /> : <Conf config={config} files={files} />}
        </>
    );
};

const Passwords = ({ config }) => {
    const mutation = (contents, app, file) =>
        request({
            url: `${config.dst.api}/servicesNS/nobody/-/storage/passwords/data/${file}/batch_save`,
            method: "POST",
            headers: {
                Authorization: `Bearer ${config.dst.token}`,
                "Content-Type": "application/json",
            },
            json: contents.slice(1).map((row) => Object.fromEntries(contents[0].map((e, i) => [e, row[i]]))),
        }).then(handle);

    const src_passwords = useApi(config.src, "servicesNS/nobody/-/storage/passwords", processConfs);
    const dst_passwords = useApi(config.dst, "servicesNS/nobody/-/storage/passwords", processConfs);

    const passwords = useMemo(() => {
        if (!src_passwords.data || !dst_passwords.data) return [];
        return Object.entries(src_passwords.data)
            .map(([app, stanzas]) => [
                app,
                Object.entries(stanzas)
                    .filter(([stanza, { content }]) => content.clear_password != dst_passwords.data?.[app]?.[stanza].content.clear_password)
                    .map(([stanza, x]) => [stanza, x, dst_passwords.data?.[app]?.[stanza]]),
            ])
            .filter(([app, stanzas]) => stanzas && stanzas.length);
    }, [src_passwords.data, dst_passwords.data]);
    return src_passwords.isLoading || dst_passwords.isLoading ? (
        <WaitSpinner size="large" />
    ) : (
        <Table stripeRows>
            <Table.Head>
                <Table.HeadCell>File</Table.HeadCell>
                <Table.HeadCell>Local</Table.HeadCell>
                <Table.HeadCell>Cloud</Table.HeadCell>
                <Table.HeadCell>Action</Table.HeadCell>
            </Table.Head>
            <Table.Body>
                {passwords.flatMap(([app, stanzas]) => [
                    <Table.Row key={app}>
                        <Table.Cell>
                            <b>{app}</b>
                        </Table.Cell>
                        <Table.Cell></Table.Cell>
                        <Table.Cell></Table.Cell>
                        <Table.Cell></Table.Cell>
                    </Table.Row>,
                    ...stanzas.map(([stanza, src, dst]) => (
                        <Table.Row key={`${app}/${stanza}`}>
                            <Table.Cell>{stanza}</Table.Cell>
                            <Table.Cell>{src.content.clear_password}</Table.Cell>
                            <Table.Cell>{dst?.content.clear_password}</Table.Cell>
                            <Table.Cell>
                                <MutateButton mutation={mutation} label={!dst ? "Create" : "Update"} />
                            </Table.Cell>
                        </Table.Row>
                    )),
                ])}
            </Table.Body>
        </Table>
    );
};
