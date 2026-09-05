import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import {
  FiMail,
  FiArrowLeft,
  FiArrowRight,
  FiUser,
  FiSmartphone,
} from 'react-icons/fi';
import SEO from '../components/SEO/SEO';
import BrandShowcase from '../components/auth/BrandShowcase';
import TrustBadges from '../components/auth/TrustBadges';
import AuthFooter from '../components/auth/AuthFooter';
import { WebPageSchema, BreadcrumbSchema } from '../utils/schema';
import { Input, FormField, FormCard } from '../components/ui/Form';
import api from '../services/api';

const FORGOT_MODES = [
  {
    key: 'email',
    label: 'Email',
    icon: FiMail,
    placeholder: 'john@example.com',
    type: 'email',
    autoComplete: 'email',
  },
  {
    key: 'username',
    label: 'Username',
    icon: FiUser,
    placeholder: 'johndoe',
    type: 'text',
    autoComplete: 'username',
  },
  {
    key: 'phone',
    label: 'Phone',
    icon: FiSmartphone,
    placeholder: '+1 555 123 4567',
    type: 'tel',
    autoComplete: 'tel',
  },
];

function detectMode(value) {
  if (value.includes('@')) return 'email';
  if (/^\+/.test(value.trim())) return 'phone';
  return 'username';
}

const forgotSchema = WebPageSchema({
  title: 'Forgot Password - Emotune',
  description: 'Reset your Emotune account password.',
  url: 'https://emotune.app/forgot-password',
  datePublished: '2024-01-01',
  dateModified: new Date().toISOString(),
});

const breadcrumbSchema = BreadcrumbSchema({
  items: [
    { name: 'Home', path: '/' },
    { name: 'Sign In', path: '/login' },
    { name: 'Forgot Password', path: '/forgot-password' },
  ],
});

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('email');
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [focusedField, setFocusedField] = useState(null);

  const activeMode = useMemo(() => {
    if (identifier.length > 0) return detectMode(identifier);
    return mode;
  }, [identifier, mode]);

  const currentMode = useMemo(
    () => FORGOT_MODES.find((m) => m.key === activeMode),
    [activeMode],
  );

  const switchMode = useCallback((m) => {
    setMode(m);
    setIdentifier('');
    setErrors({});
  }, []);

  const handleChange = useCallback((e) => {
    setIdentifier(e.target.value);
    setErrors((prev) => {
      if (!prev.identifier) return prev;
      const next = { ...prev };
      delete next.identifier;
      return next;
    });
  }, []);

  const handleBlur = useCallback(() => setFocusedField(null), []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const errs = {};
      if (!identifier.trim()) errs.identifier = 'Please enter your details';
      setErrors(errs);
      if (Object.keys(errs).length > 0) return;

      try {
        setLoading(true);
        const payload = {};
        if (activeMode === 'email') payload.email = identifier.trim();
        else if (activeMode === 'phone') payload.phone = identifier.replace(/\s/g, '');
        else payload.username = identifier.trim();

        const { data } = await api.post('/identity/auth/forgot-password', payload);

        const emailParam = encodeURIComponent(data.data?.email || identifier.trim());
        navigate(`/verify-reset?email=${emailParam}&mode=${activeMode}`);
        toast.success('Check your email for the verification code');
      } catch (err) {
        toast.error(err.response?.data?.error || 'Something went wrong');
      } finally {
        setLoading(false);
      }
    },
    [identifier, activeMode, navigate],
  );

  const inputState = useCallback(
    (field) => {
      if (errors[field]) return 'error';
      if (focusedField === field) return 'focused';
      return 'default';
    },
    [errors, focusedField],
  );

  return (
    <>
      <SEO
        title="Forgot Password"
        description="Reset your Emotune account password."
        keywords="forgot password, reset password, Emotune"
        canonical="https://emotune.app/forgot-password"
        noIndex
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(forgotSchema)}</script>
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
              <div className="relative z-10">
                <div className="text-center mb-6">
                  <Link to="/" aria-label="Go to homepage" className="inline-block">
                    <motion.img
                      src="/logo.png"
                      alt="Emotune"
                      className="w-20 h-20 mx-auto mb-1"
                      initial={{ }}
                      animate={{ }}
                      transition={{ duration: 0.3 }}
                    />
                  </Link>
                  <motion.h1
                    className="text-4xl font-bold text-text-primary dark:text-text-primary-dark tracking-tight"
                    initial={{ }}
                    animate={{ }}
                    transition={{ }}
                  >
                    Forgot password
                  </motion.h1>
                  <motion.p
                    className="text-[14px] text-text-secondary dark:text-text-secondary-dark mt-1"
                    initial={{ }}
                    animate={{ }}
                    transition={{ }}
                  >
                    Enter your details and we'll send you a verification code
                  </motion.p>
                </div>

                <motion.form
                  onSubmit={handleSubmit}
                  className="space-y-4"
                  aria-label="Forgot password form"
                  initial={{ }}
                  animate={{ }}
                  transition={{ }}
                  noValidate
                >
                  <FormField
                    field="identifier"
                    label={currentMode.label}
                    icon={<currentMode.icon size={16} />}
                    error={errors.identifier}
                  >
                    <Input
                      id="forgot-identifier"
                      type={currentMode.type}
                      value={identifier}
                      onChange={handleChange}
                      onFocus={() => setFocusedField('identifier')}
                      onBlur={handleBlur}
                      placeholder={currentMode.placeholder}
                      autoComplete={currentMode.autoComplete}
                      state={inputState('identifier')}
                      autoFocus
                      ariaRequired
                    />
                  </FormField>

                  <div className="flex gap-1.5 translate-y-[-10px]">
                    {FORGOT_MODES.map((m) => {
                      const ModeIcon = m.icon;
                      const isActive = activeMode === m.key;
                      return (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => switchMode(m.key)}
                          className={`flex items-center gap-1.5 px-1 py-0.5 rounded-md text-[10px] font-medium transition-colors duration-200 ${
                            isActive
                              ? 'bg-primary/10 dark:bg-primary-dark/10 text-primary dark:text-primary-dark border border-primary/20 dark:border-primary-dark/20'
                              : 'text-text-muted dark:text-text-muted-dark hover:text-text-secondary dark:hover:text-text-secondary-dark hover:bg-surface-elevated dark:hover:bg-surface-elevated-dark backdrop-blur-glass border border-transparent'
                          }`}
                          aria-label={`Use ${m.label}`}
                          title={m.label}
                        >
                          <ModeIcon size={11} />
                          {m.label}
                        </button>
                      );
                    })}
                  </div>

                  <motion.button
                    type="submit"
                    disabled={loading}
                    className="relative w-full h-[52px] rounded-2xl bg-primary dark:bg-primary-dark text-white text-[14px] font-semibold  disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center gap-2.5 shadow-lg shadow-primary/25 dark:shadow-primary-dark/25 hover:shadow-primary/35 dark:shadow-primary-dark/35"
                    aria-label="Send verification code"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" role="status" />
                    ) : (
                      <>
                        Continue
                        <FiArrowRight size={16} />
                      </>
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

                <motion.div
                  className="mt-8 pt-6 border-t border-border/50 dark:border-border-dark/50"
                  initial={{ }}
                  animate={{ }}
                  transition={{ }}
                >
                  <TrustBadges />
                </motion.div>

                <motion.div
                  className="mt-4"
                  initial={{ }}
                  animate={{ }}
                  transition={{ }}
                >
                  <AuthFooter />
                </motion.div>
              </div>
            </motion.div>
          </FormCard>
        </div>
      </div>
    </>
  );
}
