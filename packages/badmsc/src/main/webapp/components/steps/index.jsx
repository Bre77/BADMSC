import React, { Suspense, useReducer, useCallback } from 'react';

// Splunk UI
import Button from '@splunk/react-ui/Button';
import ChevronLeft from '@splunk/react-icons/ChevronLeft';
import ChevronRight from '@splunk/react-icons/ChevronRight';
import StepBar from '@splunk/react-ui/StepBar';

// Shared
import { localLoad, localSave } from '../../shared/helpers';
//import Step0 from '../0-start';
//import Step2 from '../2-allowlist';
//import Step3 from '../3-indexes';
//import Step4 from '../4-apps';
import { Bottom } from './styles';
import WaitSpinner from '@splunk/react-ui/WaitSpinner';

export default () => {
    const steps = [
        ['Start', React.lazy(() => import('../0-start'))],
        ['Authentication', React.lazy(() => import('../1-auth'))],
        ['IP Allow Lists', React.lazy(() => import('../2-allowlist'))],
        ['Indexes', React.lazy(() => import('../3-indexes'))],
        ['Apps', React.lazy(() => import('../4-apps'))],
        ['Global Config', React.lazy(() => import('../5-globalconfig'))],
        ['App Config', React.lazy(() => import('../6-appconfig'))],
        ['Users', React.lazy(() => import('../7-users'))],
        ['Data', React.lazy(() => import('../8-data'))],
        ['Finish', React.lazy(() => import('../9-finish'))],
    ];

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
    }
    if (step < 0) {
        return setStep(0);
    }
    let CurrentStep = steps[step][1];
    console.log(step, steps[step]);

    return (
        <div>
            <StepBar activeStepId={step}>
                {steps.map(([label, _], z) => (
                    <StepBar.Step key={z}>{label}</StepBar.Step>
                ))}
            </StepBar>
            <Suspense fallback={<WaitSpinner />}>
                <CurrentStep {...setStep} />
            </Suspense>
            <Bottom>
                <Button
                    icon={<ChevronLeft />}
                    label=" Previous"
                    appearance="primary"
                    onClick={() => setStep(step - 1)}
                    disabled={step <= 0}
                />
                <Button
                    label="Next "
                    appearance="primary"
                    onClick={() => setStep(step + 1)}
                    disabled={step >= steps.length - 1}
                >
                    <ChevronRight />
                </Button>
            </Bottom>
        </div>
    );
};
