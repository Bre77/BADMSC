import layout from "@splunk/react-page";
import { splunkdPath, username } from "@splunk/splunk-utils/config";
import { defaultFetchInit } from "@splunk/splunk-utils/fetch";
import { getUserTheme } from "@splunk/splunk-utils/themes";
import { mixins, variables } from "@splunk/themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import React, { createContext } from "react";
import styled, { createGlobalStyle } from "styled-components";

const StyledContainer = styled.div`
    ${mixins.reset("inline")};
    display: block;
    font-size: ${variables.fontSizeLarge};
    line-height: 200%;
    margin: 0 ${variables.spacing} ${variables.spacing};
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
            cacheTime: Infinity,
            staleTime: Infinity,
            retry: (failureCount, error) => error >= 500 && failureCount < 3,
            refetchOnMount: false,
        },
    },
});

const getConfig = async () =>
    fetch(`${splunkdPath}/servicesNS/${username}/badmsc/storage/passwords/badmsc%3Aauth%3A?output_mode=json&count=1&f=clear_password`, {
        ...defaultFetchInit,
    }).then((res) =>
        res.ok
            ? res
                  .json()
                  .then((data) => JSON.parse(data.entry[0].content.clear_password))
                  .then((config) => {
                      config.src.key = "src";
                      config.dst.key = "dst";
                      return config;
                  })
                  .catch(false)
            : false
    );

export const Config = createContext();

export const Page = (Child) =>
    Promise.all([getUserTheme(), getConfig()])
        .then(([theme, config]) =>
            layout(
                <QueryClientProvider client={queryClient}>
                    <GlobalStyle />
                    <StyledContainer>
                        <Config.Provider value={config}>{Child}</Config.Provider>
                    </StyledContainer>
                    <ReactQueryDevtools />
                </QueryClientProvider>,
                { theme }
            )
        )
        .catch((e) => {
            const errorEl = document.createElement("span");
            errorEl.innerHTML = e;
            document.body.appendChild(errorEl);
        });
