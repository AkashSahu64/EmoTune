import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import { FiArrowLeft, FiCheckCircle, FiLock } from 'react-icons/fi';
import SEO from '../components/SEO/SEO';
import BrandShowcase from '../components/auth/BrandShowcase';
import TrustBadges from '../components/auth/TrustBadges';
import AuthFooter from '../components/auth/AuthFooter';
import { WebPageSchema, BreadcrumbSchema } from '../utils/schema';
import { FormCard, FormField, PasswordInput } from '../components/ui/Form';
import api from '../services/api';

const resetSchema = WebPageSchema({
  title: 'Reset Password - Emotune',
  description: 'Create a new password for your Emotune account.',
  url: 'https://emotune.app/reset-password',
  datePublished: '2024-01-01',
  dateModified: new Date().toISOString(),
});

const breadcrumbSchema = BreadcrumbSchema({
  items: [
    { name: 'Home', path: '/' },
    { name: 'Sign In', path: '/login' },
    { name: 'Forgot Password', path: '/forgot-password' },
    { name: 'Reset Password', path: '/reset-password' },
  ],
});

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const verificationToken = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [focusedField, setFocusedField] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleBlur = useCallback(() => setFocusedField(null), []);

  const inputState = useCallback(
    (field) => {
      if (errors[field]) return 'error';
      if (focusedField === field) return 'focused';
      return 'default';
    },
    [errors, focusedField],
  );

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const errs = {};
      if (!password) errs.password = 'Password is required';
      else if (password.length < 8) errs.password = 'At least 8 characters';
      if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match';
      setErrors(errs);
      if (Object.keys(errs).length > 0) return;

      try {
        setLoading(true);
        await api.post('/identity/auth/reset-password', {
          verificationToken,
          password,
          confirmPassword,
        });
        setSuccess(true);
        toast.success('Password reset successfully!');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } catch (err) {
        toast.error(err.response?.data?.error || 'Failed to reset password');
      } finally {
        setLoading(false);
      }
    },
    [password, confirmPassword, verificationToken, navigate],
  );

  if (!verificationToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="text-center">
          <p className="text-danger dark:text-danger-dark text-[14px] mb-4">Invalid reset link</p>
          <Link to="/forgot-password" className="text-primary dark:text-primary-dark hover:text-primary dark:hover:text-primary-dark">
            Request a new password reset
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title="Reset Password"
        description="Create a new password for your Emotune account."
        keywords="reset password, new password, Emotune"
        canonical="https://emotune.app/reset-password"
        noIndex
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(resetSchema)}</script>
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
                      className="w-24 h-24 mx-auto mb-6 rounded-full bg-success/15 dark:bg-success-dark/15 flex items-center justify-center"
                    >
                      <FiCheckCircle size={48} className="text-success dark:text-success-dark" />
                    </motion.div>
                    <motion.h2
                      initial={{ }}
                      animate={{ }}
                      className="text-2xl font-bold text-text-primary dark:text-text-primary-dark mb-2"
                    >
                      Password changed!
                    </motion.h2>
                    <motion.p
                      initial={{ }}
                      animate={{ }}
                      transition={{ }}
                      className="text-[14px] text-text-secondary dark:text-text-secondary-dark mb-6"
                    >
                      Welcome back to Emotune
                    </motion.p>
                    <motion.div
                      initial={{ }}
                      animate={{ }}
                      transition={{ }}
                    >
                      <Link
                        to="/login"
                        className="inline-flex items-center gap-2 px-8 h-[52px] rounded-2xl bg-primary dark:bg-primary-dark text-white text-[14px] font-semibold transition-colors duration-200 shadow-lg shadow-primary/25 dark:shadow-primary-dark/25"
                      >
                        Go to login
                      </Link>
                    </motion.div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="reset"
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
                          <FiLock size={18} className="text-primary dark:text-primary-dark" />
                        </div>
                      </motion.div>
                      <motion.h1
                        className="text-3xl font-bold text-text-primary dark:text-text-primary-dark tracking-tight"
                        initial={{ }}
                        animate={{ }}
                        transition={{ }}
                      >
                        Create new password
                      </motion.h1>
                      <motion.p
                        className="text-[14px] text-text-secondary dark:text-text-secondary-dark mt-2"
                        initial={{ }}
                        animate={{ }}
                        transition={{ }}
                      >
                        Your new password must be different from previous passwords
                      </motion.p>
                    </div>

                    <motion.form
                      onSubmit={handleSubmit}
                      className="space-y-5"
                      aria-label="Reset password form"
                      initial={{ }}
                      animate={{ }}
                      transition={{ }}
                      noValidate
                    >
                      <FormField
                        field="password"
                        label="New Password"
                        required
                        error={errors.password}
                      >
                        <PasswordInput
                          id="reset-password"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            setErrors((prev) => {
                              if (!prev.password) return prev;
                              const next = { ...prev };
                              delete next.password;
                              return next;
                            });
                          }}
                          onFocus={() => setFocusedField('password')}
                          onBlur={handleBlur}
                          placeholder="Create a strong password"
                          autoComplete="new-password"
                          state={inputState('password')}
                          showStrength
                          showRequirements
                        />
                      </FormField>

                      <FormField
                        field="confirmPassword"
                        label="Confirm Password"
                        required
                        error={errors.confirmPassword}
                      >
                        <PasswordInput
                          id="reset-confirm"
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            setErrors((prev) => {
                              if (!prev.confirmPassword) return prev;
                              const next = { ...prev };
                              delete next.confirmPassword;
                              return next;
                            });
                          }}
                          onFocus={() => setFocusedField('confirmPassword')}
                          onBlur={handleBlur}
                          placeholder="Repeat your password"
                          autoComplete="new-password"
                          state={inputState('confirmPassword')}
                        />
                      </FormField>

                      <motion.button
                        type="submit"
                        disabled={loading || !password || !confirmPassword}
                        className="relative w-full h-[52px] rounded-2xl bg-primary dark:bg-primary-dark text-white text-[14px] font-semibold  disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center gap-2.5 shadow-lg shadow-primary/25 dark:shadow-primary-dark/25 hover:shadow-primary/35 dark:shadow-primary-dark/35 mt-2"
                        aria-label="Reset password"
                      >
                        {loading ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" role="status" />
                        ) : (
                          'Reset Password'
                        )}
                      </motion.button>
                    </motion.form>

                    <motion.div
                      className="mt-6 text-center"
                      initial={{ }}
                      animate={{ }}
                      transition={{ }}
                    >
                      <Link
                        to="/login"
                        className="inline-flex items-center gap-2 text-[13px] text-text-secondary dark:text-text-secondary-dark hover:text-text-secondary dark:hover:text-text-secondary-dark transition-colors font-medium"
                      >
                        <FiArrowLeft size={14} />
                        Back to login
                      </Link>
                    </motion.div>
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
