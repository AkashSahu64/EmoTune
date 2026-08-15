import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../services/api';
import { setAccessToken } from '../services/accessToken';
import Loader from '../components/Loaders/Loader';

export default function OAuthCallback() {
  const { provider } = useParams();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('Processing...');

  useEffect(() => {
    let cancelled = false;

    async function handleCallback() {
      const code = searchParams.get('code');
      const returnedState = searchParams.get('state');

      if (!code || !returnedState) {
        setError('Invalid OAuth response — missing code or state');
        setTimeout(() => window.location.href = '/login', 3000);
        return;
      }

      try {
        const stored = JSON.parse(sessionStorage.getItem('oauth_state') || '{}');
        if (stored.state !== returnedState || stored.provider !== provider) {
          throw new Error('Security check failed — session mismatch');
        }
        sessionStorage.removeItem('oauth_state');

        setStatus('Verifying credentials...');
        const { data } = await api.post('/identity/auth/oauth/callback', { provider, code, state: returnedState });

        if (data.data?.accessToken) {
          setAccessToken(data.data.accessToken);
        }

        setStatus('Signing you in...');
        await new Promise(r => setTimeout(r, 500));

        if (!cancelled) window.location.href = '/app';
      } catch (err) {
        if (!cancelled) {
          const message = err.response?.data?.error || err.message || 'OAuth login failed';
          setError(message);
          setTimeout(() => window.location.href = '/login', 4000);
        }
      }
    }

    handleCallback();
    return () => { cancelled = true; };
  }, [provider, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <motion.div
          className="text-center p-10 max-w-[380px]"
          initial={{ }}
          animate={{ }}
        >
          <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--theme-danger)" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <p className="text-danger text-sm font-medium mb-2">Authentication failed</p>
          <p className="text-text-secondary text-xs">{error}</p>
          <div className="mt-4 w-8 h-8 border-2 border-border border-t-[var(--theme-primary)] rounded-full animate-spin mx-auto" />
          <p className="text-[10px] text-text-muted mt-2">Redirecting...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent">
      <motion.div
        className="text-center p-10"
        initial={{ }}
        animate={{ }}
        transition={{ duration: 0.5 }}
      >
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-text-secondary text-sm font-medium">{status}</p>
        <p className="text-text-secondary text-xs mt-2">Please wait while we securely sign you in</p>
      </motion.div>
    </div>
  );
}
