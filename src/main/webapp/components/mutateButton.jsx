import Button from "@splunk/react-ui/Button";
import React from "react";

export default ({ mutation, label, disabled }) => (
    <Button
        appearance={{ idle: "default", loading: "pill", success: "primary", error: "destructive" }[mutation.status]}
        onClick={mutation.mutate}
        disabled={mutation.isLoading || disabled}
        label={{ idle: label, loading: "Running", success: "Success", error: "Failed" }[mutation.status]}
    />
);
