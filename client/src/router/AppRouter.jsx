import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const LandingPage = lazy(() => import('../pages/LandingPage'));
const LoginPage = lazy(() => import('../pages/LoginPage'));
const SignupPage = lazy(() => import('../pages/SignupPage'));
const ForgotPasswordPage = lazy(() => import('../pages/ForgotPasswordPage'));
const VerifyResetPage = lazy(() => import('../pages/VerifyResetPage'));
const ResetPasswordPage = lazy(() => import('../pages/ResetPasswordPage'));
const Dashboard = lazy(() => import('../pages/Dashboard'));
const MemorySearchPage = lazy(() => import('../pages/MemorySearchPage'));
const OAuthCallback = lazy(() => import('../pages/OAuthCallback'));

function RouteShellFallback() {
  return (
    <div className="min-h-screen bg-background dark:bg-background-dark p-3 text-text-primary dark:text-text-primary-dark" role="status" aria-label="Loading application">
      <div className="mx-auto flex h-[calc(100vh-1.5rem)] max-w-screen-2xl gap-3 overflow-hidden">
        <aside className="hidden w-sidebar shrink-0 rounded-2xl border border-border/30 dark:border-border-dark/30 bg-surface/60 dark:bg-surface-dark/60 p-3 lg:block">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-11 w-11 rounded-full shimmer-bg" />
            <div className="space-y-2">
              <div className="h-3 w-24 rounded shimmer-bg" />
              <div className="h-2 w-16 rounded shimmer-bg" />
            </div>
          </div>
          <div className="mb-4 h-10 rounded-xl shimmer-bg" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="h-12 rounded-xl shimmer-bg" />
            ))}
          </div>
        </aside>
        <main className="flex min-w-0 flex-1 flex-col rounded-2xl border border-border/30 dark:border-border-dark/30 bg-surface/40 dark:bg-surface-dark/40">
          <div className="h-16 border-b border-border/30 dark:border-border-dark/30 p-4">
            <div className="h-3 w-32 rounded shimmer-bg" />
          </div>
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-md space-y-4 px-6">
              <div className="mx-auto h-16 w-16 rounded-2xl shimmer-bg" />
              <div className="mx-auto h-4 w-48 rounded shimmer-bg" />
              <div className="mx-auto h-3 w-72 max-w-full rounded shimmer-bg" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  // A cached, non-sensitive user snapshot allows the protected shell to
  // render immediately after refresh while AuthProvider validates the real
  // HTTP-only-cookie session in the background.
  if (loading && !user) return <RouteShellFallback />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <RouteShellFallback />;
  if (user) return <Navigate to="/app" replace />;
  return children;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteShellFallback />}>
        <Routes>
          <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
          <Route path="/verify-reset" element={<PublicRoute><VerifyResetPage /></PublicRoute>} />
          <Route path="/reset-password" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
          <Route path="/app" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/app/chat/:chatId" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/app/memory" element={<ProtectedRoute><MemorySearchPage /></ProtectedRoute>} />
          <Route path="/auth/:provider/callback" element={<OAuthCallback />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
