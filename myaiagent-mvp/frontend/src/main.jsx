import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import App from './App';
import './styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true,
      retry: (failureCount, error) => {
        // Don't retry on 429 (rate limit) - wait for next scheduled refetch
        if (error?.response?.status === 429) {
          return false;
        }
        // Don't retry on 4xx errors (client errors)
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        // Retry once on network errors or 5xx errors
        return failureCount < 1;
      },
      staleTime: 2 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      networkMode: 'online',
    },
    mutations: {
      retry: (failureCount, error) => {
        // Don't retry on 429 or client errors
        if (error?.response?.status === 429 || (error?.response?.status >= 400 && error?.response?.status < 500)) {
          return false;
        }
        return failureCount < 1;
      },
      networkMode: 'online',
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
