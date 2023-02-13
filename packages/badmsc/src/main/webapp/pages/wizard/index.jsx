__webpack_public_path__ = window.resourceBasePath;

import React from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { variables, mixins } from '@splunk/themes';
import { QueryClient, QueryClientProvider, useIsFetching } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Splunk UI
import layout from '@splunk/react-page';
import { getUserTheme } from '@splunk/splunk-utils/themes';
import Progress from '@splunk/react-ui/Progress';
import ToastMessages from '@splunk/react-toast-notifications/ToastMessages';

//Shared
import Steps from '../../components/steps';

const StyledContainer = styled.div`
    ${mixins.reset('inline')};
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

const Loading = () => {
    const isFetching = useIsFetching();
    return isFetching ? <Progress percentage={100} /> : <div style={{ height: '3px' }}></div>;
};

// Setup the query client with defaults
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            cacheTime: 1000 * 60 * 60, // 1 hour
            retry: process.env.NODE_ENV === 'production',
            refetchOnMount: true,
            staleTime: 60000,
        },
    },
});

getUserTheme()
    .then((theme) => {
        layout(
            <QueryClientProvider client={queryClient}>
                <GlobalStyle />
                <Loading />
                <StyledContainer>
                    <Steps />
                </StyledContainer>
                <ReactQueryDevtools />
                <ToastMessages />
            </QueryClientProvider>,
            { theme }
        );
    })
    .catch((e) => {
        const errorEl = document.createElement('span');
        errorEl.innerHTML = e;
        document.body.appendChild(errorEl);
    });
