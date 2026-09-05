import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import {
  FiArrowLeft,
  FiMail,
  FiCheckCircle,
  FiRefreshCw,
} from 'react-icons/fi';
import SEO from '../components/SEO/SEO';
import BrandShowcase from '../components/auth/BrandShowcase';
import TrustBadges from '../components/auth/TrustBadges';
import AuthFooter from '../components/auth/AuthFooter';
import { WebPageSchema, BreadcrumbSchema } from '../utils/schema';
import { FormCard } from '../components/ui/Form';
import OTPInput from '../components/auth/OTPInput';
import api from '../services/api';

const RESEND_COOLDOWN = 30;

const verifySchema = WebPageSchema({
  title: 'Verify Code - Emotune',
  description: 'Enter the verification code sent to your email.',
  url: 'https://emotune.app/verify-reset',
  datePublished: '2024-01-01',
  dateModified: new Date().toISOString(),
});

const breadcrumbSchema = BreadcrumbSchema({
  items: [
    { name: 'Home', path: '/' },
    { name: 'Sign In', path: '/login' },
    { name: 'Forgot Password', path: '/forgot-password' },
    { name: 'Verify Code', path: '/verify-reset' },
  ],
});

export default function VerifyResetPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const mode = searchParams.get('mode') || 'email';

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const [resending, setResending] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (countdown > 0) {
      timerRef.current = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [countdown]);

  const handleResend = useCallback(async () => {
    if (countdown > 0 || resending) return;
    try {
      setResending(true);
      const payload = {};
      if (mode === 'email') payload.email = decodeURIComponent(email);
      else if (mode === 'username') payload.username = decodeURIComponent(email);
      else payload.phone = decodeURIComponent(email);

      await api.post('/identity/auth/forgot-password', payload);
      setCountdown(RESEND_COOLDOWN);
      setOtp('');
      setError('');
      toast.success('New code sent');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  }, [countdown, resending, email, mode]);

  const handleVerify = useCallback(async () => {
    if (otp.length !== 6 || loading) return;

    try {
      setLoading(true);
      setError('');

      const { data } = await api.post('/identity/auth/verify-reset-code', {
        email: decodeURIComponent(email),
        otp,
      });

      setSuccess(true);
      const token = encodeURIComponent(data.data.verificationToken);

      setTimeout(() => {
        navigate(`/reset-password?token=${token}`);
      }, 1500);
    } catch (err) {
      const msg = err.response?.data?.error || 'Invalid code';
      setError(msg);
      setOtp('');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [otp, loading, email, navigate]);

  const handleOtpChange = useCallback((value) => {
    setOtp(value);
    setError('');
  }, []);

  useEffect(() => {
    if (otp.length === 6 && !loading) {
      handleVerify();
    }
  }, [otp]);

  const decodedEmail = decodeURIComponent(email);

  return (
    <>
      <SEO
        title="Verify Code"
        description="Enter the verification code sent to your email."
        keywords="verify code, OTP, reset password, Emotune"
        canonical="https://emotune.app/verify-reset"
        noIndex
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(verifySchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      </Helmet>

      <div className="min-h-screen flex bg-transparent">
        <BrandShowcase />

        <div className="flex-1 flex items-center justify-center px-2 py-4 bg-transparent relative overflow-hidden">
          <FormCard maxWidth="max-w-[520px]">
            <motion.div
              className="auth-surface-card w-full max-w-[520px] rounded-3xl border border-border/60 dark:border-border-dark/60 bg-surface/40 dark:bg-surface-dark/40 backdrop-blur-glass backdrop-blur-md px-8 py-6 shadow-lg shadow-black/20 relative overflow-hidden"
              initial={{ }}
              animate={{ }}
              transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <AnimatePresence mode="wait">
                {success ? (
                  <motion.div
                    key="success"
                    initial={{ }}
                    animate={{ }}
                    className="relative z-10 text-center py-8"
                  >
                    <motion.div
                      initial={{}}
                      animate={{}}
                      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                      className="w-20 h-20 mx-auto mb-6 rounded-full bg-success/15 dark:bg-success-dark/15 flex items-center justify-center"
                    >
                      <FiCheckCircle size={40} className="text-success dark:text-success-dark" />
                    </motion.div>
                    <motion.h2
                      initial={{ }}
                      animate={{ }}
                      className="text-2xl font-bold text-text-primary dark:text-text-primary-dark mb-2"
                    >
                      Code verified!
                    </motion.h2>
                    <motion.p
                      initial={{ }}
                      animate={{ }}
                      transition={{ }}
                      className="text-[14px] text-text-secondary dark:text-text-secondary-dark"
                    >
                      Redirecting to reset your password...
                    </motion.p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="verify"
                    initial={{ }}
                    animate={{ }}
                    exit={{ }}
                    className="relative z-10"
                  >
                    <div className="text-center mb-8">
                      <Link to="/" aria-label="Go to homepage" className="inline-block">
                        <motion.img
                          src="/logo.png"
                          alt="Emotune"
                          className="w-16 h-16 mx-auto mb-4"
                          initial={{ }}
                          animate={{ }}
                          transition={{ duration: 0.3 }}
                        />
                      </Link>
                      <motion.div
                        initial={{ }}
                        animate={{ }}
                        transition={{ }}
                        className="flex items-center justify-center gap-2 mb-3"
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary-dark/10 flex items-center justify-center">
                          <FiMail size={18} className="text-primary dark:text-primary-dark" />
                        </div>
                      </motion.div>
                      <motion.h1
                        className="text-3xl font-bold text-text-primary dark:text-text-primary-dark tracking-tight"
                        initial={{ }}
                        animate={{ }}
                        transition={{ }}
                      >
                        Check your email
                      </motion.h1>
                      <motion.p
                        className="text-[14px] text-text-secondary dark:text-text-secondary-dark mt-2"
                        initial={{ }}
                        animate={{ }}
                        transition={{ }}
                      >
                        We sent a 6-digit code to{' '}
                        <span className="text-text-primary dark:text-text-primary-dark font-medium">{decodedEmail}</span>
                      </motion.p>
                    </div>

                    <motion.div
                      initial={{ }}
                      animate={{ }}
                      transition={{ }}
                    >
                      <OTPInput
                        value={otp}
                        onChange={handleOtpChange}
                        disabled={loading}
                        error={error}
                      />
                    </motion.div>

                    {error && (
                      <motion.p
                        initial={{ }}
                        animate={{ }}
                        className="text-[12px] text-danger dark:text-danger-dark text-center mt-4"
                      >
                        {error}
                      </motion.p>
                    )}

                    <motion.div
                      className="mt-8 flex flex-col items-center gap-4"
                      initial={{ }}
                      animate={{ }}
                      transition={{ }}
                    >
                      <div className="flex items-center gap-2 text-[13px] text-text-secondary dark:text-text-secondary-dark">
                        {countdown > 0 ? (
                          <>
                            <span>Resend code in</span>
                            <span className="text-warning dark:text-warning-dark font-mono font-semibold min-w-[24px] text-center">
                              {countdown}s
                            </span>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={handleResend}
                            disabled={resending}
                            className="flex items-center gap-1.5 text-primary dark:text-primary-dark hover:text-primary dark:hover:text-primary-dark transition-colors font-medium disabled:opacity-50"
                          >
                            <FiRefreshCw size={14} className={resending ? 'animate-spin' : ''} />
                            {resending ? 'Sending...' : 'Resend code'}
                          </button>
                        )}
                      </div>

                      <Link
                        to="/forgot-password"
                        className="inline-flex items-center gap-2 text-[12px] text-text-muted dark:text-text-muted-dark hover:text-text-secondary dark:hover:text-text-secondary-dark transition-colors"
                      >
                        <FiArrowLeft size={12} />
                        Change email
                      </Link>
                    </motion.div>

                    <motion.button
                      type="button"
                      onClick={handleVerify}
                      disabled={otp.length !== 6 || loading}
                      className="relative w-full h-[52px] mt-6 rounded-2xl bg-primary dark:bg-primary-dark text-white text-[14px] font-semibold  disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center gap-2.5 shadow-lg shadow-primary/25 dark:shadow-primary-dark/25 hover:shadow-primary/35 dark:shadow-primary-dark/35"
                      aria-label="Verify code"
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" role="status" />
                      ) : (
                        'Verify'
                      )}
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </FormCard>
        </div>
      </div>
    </>
  );
}
