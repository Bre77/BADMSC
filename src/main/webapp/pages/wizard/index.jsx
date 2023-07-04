__webpack_public_path__ = window.resourceBasePath;

import layout from "@splunk/react-page";
import { getUserTheme } from "@splunk/splunk-utils/themes";
import { mixins, variables } from "@splunk/themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import React from "react";
import styled, { createGlobalStyle } from "styled-components";
import Steps from "../../steps";

const StyledContainer = styled.div`
    ${mixins.reset("inline")};
    display: block;
    font-size: ${variables.fontSizeLarge};
    line-height: 200%;
    margin: ${variables.spacing} ${variables.spacing};
`;

// Theme based background colour
const GlobalStyle = createGlobalStyle`
    body {
        background-color: ${variables.backgroundColorPage};
    }
`;

// Setup the query client with defaults
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            cacheTime: 300000, // 5 minute
            staleTime: 300000, // 5 minute
            retry: (failureCount, error) => error !== 404 && failureCount < 3,
            refetchOnMount: true,
        },
    },
});

getUserTheme()
    .then((theme) => {
        //theme = 'dark';
        return layout(
            <QueryClientProvider client={queryClient}>
                <GlobalStyle />
                <StyledContainer>
                    <Steps />
                </StyledContainer>
                <ReactQueryDevtools />
            </QueryClientProvider>,
            { theme }
        );
    })
    .catch((e) => {
        const errorEl = document.createElement("span");
        errorEl.innerHTML = e;
        document.body.appendChild(errorEl);
    });
