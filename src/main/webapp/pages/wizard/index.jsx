__webpack_public_path__ = window.resourceBasePath;

import React from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { variables, mixins } from '@splunk/themes';
import { QueryClient, QueryClientProvider, useIsFetching } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import layout from '@splunk/react-page';
import { getUserTheme } from '@splunk/splunk-utils/themes';
import Progress from '@splunk/react-ui/Progress';
import ToastMessages from '@splunk/react-toast-notifications/ToastMessages';
import Steps from '../../steps';

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
    return isFetching ? <Progress percentage={100} /> : <div style={{ height: '3px' }} />;
};

// Setup the query client with defaults
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            cacheTime: 60000, // 1 minute
            retry: process.env.NODE_ENV === 'production',
            refetchOnMount: true,
            staleTime: 600000, // 10 minutes,
        },
    },
});

getUserTheme()
    .then((theme) => {
        //theme = 'dark';
        return layout(
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
