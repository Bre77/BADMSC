import React, { useReducer, useCallback } from 'react';

// Splunk UI
import Button from '@splunk/react-ui/Button';
import ChevronLeft from '@splunk/react-icons/ChevronLeft';
import ChevronRight from '@splunk/react-icons/ChevronRight';
import StepBar from '@splunk/react-ui/StepBar';
import Heading from '@splunk/react-ui/Heading';

// Shared
import { localLoad, localSave } from '../shared/helpers';
import Step0 from './0-start';
import Step1 from './1-auth';
import Step2 from './2-allowlist';
import Step3 from './3-indexes';
import Step4 from './4-apps';
import Step55 from './5-1-systemconfig';
import Step5 from './5-2-globalconfig';
import Step6 from './6-appconfig';
import Step7 from './7-navigation';
import Step8 from './8-views';
import Step9 from './9-lookups';
import Step10 from './10-users';
import Step11 from './11-data';
import Step12 from './12-finish';
import { Top, Bottom, Nav } from './styles';

export default () => {
    const steps = [
        ['Start', Step0], //React.lazy(() => import('../0-start'))
        ['Authentication', Step1], //React.lazy(() => import('../1-auth'))
        ['IP Allow Lists', Step2], //React.lazy(() => import('../2-allowlist'))
        ['Indexes', Step3],
        ['Apps', Step4],
        ['System Config', Step55],
        ['Global Config', Step5],
        ['App Config', Step6],
        ['Navigation', Step7],
        ['Views', Step8],
        ['Lookups', Step9],
        ['Users', Step10],
        ['Data', Step11],
        ['Finish', Step12],
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
    let [label, Step] = steps[step];

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
                <Nav>
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
                        disabled={step >= steps.length - 1}
                    >
                        <ChevronRight />
                    </Button>
                </Nav>
            </Top>
            <Step step={step} />
        </div>
    );
};
