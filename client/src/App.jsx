import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'sonner';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './services/queryClient';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { PersonaProvider } from './contexts/PersonaContext';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';
import ApplicationBackground from './components/layout/ApplicationBackground';
import AppRouter from './router/AppRouter';

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
const GTAG_MANAGER_ID = import.meta.env.VITE_GTM_ID;
const CLARITY_ID = import.meta.env.VITE_CLARITY_ID;

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <ThemeProvider>
          <AuthProvider>
            <SocketProvider>
              <PersonaProvider>
                <ErrorBoundary>
                  <ApplicationBackground>
                    <AppRouter />
                  </ApplicationBackground>

                {GA_MEASUREMENT_ID && (
                  <>
                    <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} />
                    <script
                      dangerouslySetInnerHTML={{
                        __html: `
                          window.dataLayer = window.dataLayer || [];
                          function gtag(){dataLayer.push(arguments);}
                          gtag('js', new Date());
                          gtag('config', '${GA_MEASUREMENT_ID}');
                        `,
                      }}
                    />
                  </>
                )}

                {GTAG_MANAGER_ID && (
                  <noscript>
                    <iframe
                      src={`https://www.googletagmanager.com/ns.html?id=${GTAG_MANAGER_ID}`}
                      height="0"
                      width="0"
                      style={{ display: 'none', visibility: 'hidden' }}
                      title="Google Tag Manager"
                    />
                  </noscript>
                )}

                {CLARITY_ID && (
                  <script
                    dangerouslySetInnerHTML={{
                      __html: `
                        (function(c,l,a,r,i,t,y){
                          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                          t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
                        })(window, document, "clarity", "script", "${CLARITY_ID}");
                      `,
                    }}
                  />
                )}
                </ErrorBoundary>

              <Toaster
                position="top-right"
                toastOptions={{
                  classNames: {
                    toast: 'glass-popover !rounded-lg !border-border/30 dark:border-border-dark/30 !bg-surface-floating/90 dark:bg-surface-floating-dark/90 !text-text-primary dark:text-text-primary-dark',
                    title: '!text-text-primary dark:text-text-primary-dark',
                    description: '!text-text-secondary dark:text-text-secondary-dark',
                    actionButton: '!bg-primary dark:bg-primary-dark !text-on-primary dark:text-on-primary-dark',
                    cancelButton: '!bg-surface-elevated dark:bg-surface-elevated-dark !text-text-secondary dark:text-text-secondary-dark',
                  },
                }}
              />
              </PersonaProvider>
            </SocketProvider>
          </AuthProvider>
        </ThemeProvider>
      </HelmetProvider>
    </QueryClientProvider>
  );
}
