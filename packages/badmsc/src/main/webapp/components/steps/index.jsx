import React, { useReducer, useCallback } from 'react';

// Splunk UI
import Button from '@splunk/react-ui/Button';
import ChevronLeft from '@splunk/react-icons/ChevronLeft';
import ChevronRight from '@splunk/react-icons/ChevronRight';
import StepBar from '@splunk/react-ui/StepBar';

// Shared
import { localLoad, localSave } from '../../shared/helpers';
import Step1 from '../../components/1-start';
import Step2 from '../../components/2-allowlist';
import { Bottom } from './styles';

export default () => {
    const steps = [
        ['Start', Step1],
        ['IP Allow List', Step2],
        ['Indexes', Step1],
        ['Apps', Step1],
        ['Data', Step1],
        ['Users', Step1],
        ['Finish', Step1],
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
            {step}
            <CurrentStep {...setStep} />
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
