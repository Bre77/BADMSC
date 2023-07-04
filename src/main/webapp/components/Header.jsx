import ChevronLeft from "@splunk/react-icons/ChevronLeft";
import ChevronRight from "@splunk/react-icons/ChevronRight";
import Button from "@splunk/react-ui/Button";
import Heading from "@splunk/react-ui/Heading";
import React from "react";
import styled from "styled-components";
export const Top = styled.div`
    display: flex;
    justify-content: space-between;
    width: 100%;
`;

export const Steper = styled.div`
    margin: 1.414em 0 0.4em;
`;

export default ({ title, prev, next }) => {
    return (
        <Top>
            <Heading level={1}>{title}</Heading>
            <Steper>
                <Button icon={<ChevronLeft />} label=" Previous" appearance="primary" to={prev} disabled={!prev} />
                <Button label="Next " appearance="primary" to={next} disabled={!next}>
                    <ChevronRight />
                </Button>
            </Steper>
        </Top>
    );
};
