import React, { Suspense, useReducer, useCallback, useEffect } from 'react';

// Splunk UI
import Button from '@splunk/react-ui/Button';
import ChevronLeft from '@splunk/react-icons/ChevronLeft';
import ChevronRight from '@splunk/react-icons/ChevronRight';
import StepBar from '@splunk/react-ui/StepBar';
import Heading from '@splunk/react-ui/Heading';

// Shared
import { localLoad, localSave } from '../shared/helpers';
import { Top, Steper } from './styles';
import { useConfig } from '../shared/hooks';
import WaitSpinner from '@splunk/react-ui/WaitSpinner';

import Start from './start';
import Auth from './auth';
import Allowlist from './allowlist';
import Indexes from './indexes';
import Apps from './apps';
import CSV from './lookup_csv';
import Sourcetypes from './sourcetypes';
import ConfigSystem from './config_system';
import ConfigGlobal from './config_global';
import ConfigApp from './config_app';
import Nav from './nav';
import Views from './views';
import KV from './lookup_kv';
import Users from './users';
import Data from './data';
import Finish from './finish';
import Roles from './roles'

const steps = [
    ['Start', Start],
    ['Authentication', Auth],
    ['IP Allow Lists', Allowlist],
    ['Indexes', Indexes],
    ['Apps', Apps],
    ['Roles', Roles],
    ['Sourcetypes', Sourcetypes],
    ['System Config', ConfigSystem],
    ['Global Config', ConfigGlobal],
    ['App Config', ConfigApp],
    ['Private Config', Users],
    ['Navigation', Nav],
    ['Views', Views],
    ['CSV Lookups', CSV],
    ['KV Lookups', KV],
    ['Data', Data],
    ['Finish', Finish],
];

export default () => {
    const [step, setStep] = useReducer((prev, value) => {
        if (value < 0) value = 0;
        else if (value > steps.length - 1) value = steps.length - 1;
        localSave('BADRCM_step', value);
        return value;
    }, localLoad('BADRCM_step', 0));

    const handlePrevious = useCallback(() => {
        setStep(step - 1);
    }, [step]);

    const handleNext = useCallback(() => {
        setStep(step + 1);
    }, [step]);

    if (step > steps.length - 1) {
        return setStep(steps.length - 1);
    } else if (step < 0) {
        return setStep(0);
    }
    const Step = steps[step][1];

    const config = useConfig();

    useEffect(() => {
        ((config.data && ('src' in config.data === false || 'dst' in config.data === false)) ||
            config.data === false) &&
            step > 1 &&
            setStep(1);
    }, [config.data]);

    return (
        <div>
            <StepBar activeStepId={step}>
                {steps.map(([label, _], z) => (
                    <StepBar.Step key={z}>{label}</StepBar.Step>
                ))}
            </StepBar>

            <Top>
                {step > 0 ? (
                    <Heading level={1}>
                        Step {step} - {steps[step][0]}
                    </Heading>
                ) : (
                    <Heading level={1}>Migrate to Splunk Cloud</Heading>
                )}
                <Steper>
                    <Button
                        icon={<ChevronLeft />}
                        label=" Previous"
                        appearance="primary"
                        onClick={handlePrevious}
                        disabled={step <= 0}
                    />
                    <Button
                        label="Next "
                        appearance="primary"
                        onClick={handleNext}
                        disabled={step >= steps.length - 1 || (!config.data && step > 0)}
                    >
                        <ChevronRight />
                    </Button>
                </Steper>
            </Top>
            {config.data === undefined ? (
                <WaitSpinner />
            ) : (
                <Step step={step} config={config.data} />
            )}
        </div>
    );
};
