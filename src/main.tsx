import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './app/theme';
import { AuthProvider } from './app/auth';
import { I18nProvider } from './app/i18n';
import { AppRouter } from './app/router';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) =>
        // Never retry an auth or permission failure — the SDK already handled
        // the one refresh that could help.
        failureCount < 2 && !(error as { status?: number })?.status?.toString().startsWith('4'),
      refetchOnWindowFocus: true,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <I18nProvider>
            <AuthProvider>
              <BrowserRouter>
                <AppRouter />
              </BrowserRouter>
              <Toaster richColors closeButton position="top-right" />
            </AuthProvider>
          </I18nProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
);
