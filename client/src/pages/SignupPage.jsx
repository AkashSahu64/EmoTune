import { useState, useCallback, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';
import { FiUser, FiMail, FiArrowRight } from 'react-icons/fi';
import SEO from '../components/SEO/SEO';
import BrandShowcase from '../components/auth/BrandShowcase';
import TrustBadges from '../components/auth/TrustBadges';
import AuthFooter from '../components/auth/AuthFooter';
import { WebPageSchema, BreadcrumbSchema } from '../utils/schema';
import {
  Input,
  PasswordInput,
  PhoneInput,
  FormField,
  FormCard,
} from '../components/ui/Form';

const SocialLoginButtons = lazy(
  () => import('../components/auth/SocialLoginButtons'),
);

const signupSchema = WebPageSchema({
  title: 'Create Account - Emotune',
  description: 'Create your free Emotune account.',
  url: 'https://emotune.app/signup',
  datePublished: '2024-01-01',
  dateModified: new Date().toISOString(),
});

const breadcrumbSchema = BreadcrumbSchema({
  items: [
    { name: 'Home', path: '/' },
    { name: 'Create Account', path: '/signup' },
  ],
});

const INITIAL_FORM = {
  fullName: '',
  username: '',
  email: '',
  countryCode: 'US',
  phone: '',
  password: '',
  confirmPassword: '',
  acceptTerms: false,
};

function validateForm(form) {
  const errs = {};
  if (!form.fullName.trim()) errs.fullName = 'Full name is required';
  if (!form.username.trim()) errs.username = 'Username is required';
  else if (!/^[a-zA-Z0-9_]{3,30}$/.test(form.username))
    errs.username = '3-30 chars, letters, numbers, underscores';
  if (!form.email.trim()) errs.email = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    errs.email = 'Invalid email format';
  if (form.phone && !/^\+[1-9]\d{6,14}$/.test(form.phone))
    errs.phone = 'Invalid phone number';
  if (!form.password) errs.password = 'Password is required';
  else if (form.password.length < 8) errs.password = 'At least 8 characters';
  if (form.password !== form.confirmPassword)
    errs.confirmPassword = 'Passwords do not match';
  if (!form.acceptTerms) errs.acceptTerms = 'You must accept the terms';
  return errs;
}

export default function SignupPage() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [focusedField, setFocusedField] = useState(null);
  const { signup } = useAuth();

  const updateField = useCallback(
    (field) => (e) => {
      const value =
        e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    [],
  );

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const errs = validateForm(form);
      setErrors(errs);
      if (Object.keys(errs).length > 0) return;

      try {
        setLoading(true);
        await signup({
          fullName: form.fullName.trim(),
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
          confirmPassword: form.confirmPassword,
          countryCode: form.countryCode,
          phone: form.phone || undefined,
        });
        toast.success('Account created! Welcome to Emotune');
      } catch (err) {
        toast.error(err.response?.data?.error || 'Signup failed');
      } finally {
        setLoading(false);
      }
    },
    [form, signup],
  );

  const handleFocus = useCallback((field) => () => setFocusedField(field), []);
  const handleBlur = useCallback(() => setFocusedField(null), []);

  const handleCountryChange = useCallback((e) => {
    setForm((prev) => ({ ...prev, countryCode: e.target.value }));
  }, []);

  const handlePhoneChange = useCallback((value) => {
    setForm((prev) => ({ ...prev, phone: value }));
  }, []);

  const inputState = useCallback(
    (field) => {
      if (errors[field]) return 'error';
      if (focusedField === field) return 'focused';
      return 'default';
    },
    [errors, focusedField],
  );

  const anyError = Object.keys(errors).length > 0;

  return (
    <>
      <SEO
        title="Create Account"
        description="Create your free Emotune account."
        keywords="sign up, create account, register, Emotune, AI chat"
        canonical="https://emotune.app/signup"
        noIndex
      />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(signupSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
      </Helmet>

      <div className="min-h-screen flex bg-transparent">
        <BrandShowcase />

        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 xl:px-8 py-8 bg-transparent relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-primary dark:bg-primary-dark opacity-[0.03] rounded-full blur-[140px]" />
            <div className="absolute bottom-1/3 right-1/3 w-[400px] h-[400px] bg-[#7C3AED] opacity-[0.02] rounded-full blur-[100px]" />
          </div>

          <FormCard maxWidth="max-w-[520px]">
            <motion.div
              className="auth-surface-card w-full max-w-[520px] rounded-[32px] border border-border/60 dark:border-border-dark/60 bg-surface/40 dark:bg-surface-dark/40 backdrop-blur-glass backdrop-blur-xl px-10 py-10 shadow-floating dark:shadow-floating-dark shadow-black/40 relative overflow-hidden"
              initial={{ }}
              animate={{ }}
              transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary dark:bg-primary-dark opacity-[0.04] rounded-full blur-[100px]" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#7C3AED] opacity-[0.03] rounded-full blur-[100px]" />
              </div>

              <div className="relative z-10">
                <div className="text-center mb-10">
                  <Link
                    to="/"
                    aria-label="Go to homepage"
                    className="inline-block"
                  >
                    <motion.img
                      src="/logo.png"
                      alt="Emotune"
                      className="w-14 h-14 mx-auto mb-5"
                      initial={{ }}
                      animate={{ }}
                      transition={{ duration: 0.3 }}
                    />
                  </Link>
                  <motion.h1
                    className="text-[28px] font-bold text-text-primary dark:text-text-primary-dark tracking-tight"
                    initial={{ }}
                    animate={{ }}
                    transition={{ }}
                  >
                    Create your account
                  </motion.h1>
                  <motion.p
                    className="text-[14px] text-text-secondary dark:text-text-secondary-dark mt-2"
                    initial={{ }}
                    animate={{ }}
                    transition={{ }}
                  >
                    Join the AI-powered conversation platform
                  </motion.p>
                </div>

                <motion.form
                  onSubmit={handleSubmit}
                  className="space-y-5"
                  aria-label="Sign up form"
                  initial={{ }}
                  animate={{ }}
                  transition={{ }}
                  noValidate
                >
                  <FormField
                    field="fullName"
                    label="Full Name"
                    required
                    icon={<FiUser size={16} />}
                    error={errors.fullName}
                  >
                    <Input
                      id="field-fullName"
                      type="text"
                      value={form.fullName}
                      onChange={updateField('fullName')}
                      onFocus={handleFocus('fullName')}
                      onBlur={handleBlur}
                      placeholder="John Doe"
                      autoComplete="name"
                      state={inputState('fullName')}
                      ariaRequired
                    />
                  </FormField>

                  <FormField
                    field="username"
                    label="Username"
                    required
                    icon={<FiUser size={16} />}
                    error={errors.username}
                  >
                    <Input
                      id="field-username"
                      type="text"
                      value={form.username}
                      onChange={updateField('username')}
                      onFocus={handleFocus('username')}
                      onBlur={handleBlur}
                      placeholder="johndoe"
                      autoComplete="username"
                      state={inputState('username')}
                      ariaRequired
                    />
                  </FormField>

                  <FormField
                    field="email"
                    label="Email"
                    required
                    icon={<FiMail size={16} />}
                    error={errors.email}
                  >
                    <Input
                      id="field-email"
                      type="email"
                      value={form.email}
                      onChange={updateField('email')}
                      onFocus={handleFocus('email')}
                      onBlur={handleBlur}
                      placeholder="john@example.com"
                      autoComplete="email"
                      state={inputState('email')}
                      ariaRequired
                    />
                  </FormField>

                  <FormField
                    field="phone"
                    label="Phone Number"
                    error={errors.phone}
                  >
                    <PhoneInput
                      value={form.phone}
                      countryCode={form.countryCode}
                      onPhoneChange={handlePhoneChange}
                      onCountryChange={handleCountryChange}
                      onFocus={handleFocus('phone')}
                      onBlur={handleBlur}
                      state={inputState('phone')}
                      id="field-phone"
                    />
                  </FormField>

                  <FormField
                    field="password"
                    label="Password"
                    required
                    error={errors.password}
                  >
                    <PasswordInput
                      id="field-password"
                      value={form.password}
                      onChange={updateField('password')}
                      onFocus={handleFocus('password')}
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
                      id="field-confirm"
                      value={form.confirmPassword}
                      onChange={updateField('confirmPassword')}
                      onFocus={handleFocus('confirmPassword')}
                      onBlur={handleBlur}
                      placeholder="Repeat your password"
                      autoComplete="new-password"
                      state={inputState('confirmPassword')}
                    />
                  </FormField>

                  <div>
                    <label className="flex items-start gap-3 cursor-pointer select-none group">
                      <input
                        type="checkbox"
                        checked={form.acceptTerms}
                        onChange={updateField('acceptTerms')}
                        className="mt-0.5 w-4 h-4 rounded border-border dark:border-border-dark bg-surface dark:bg-surface-dark backdrop-blur-glass text-primary dark:text-primary-dark focus:ring-focus/30 dark:focus:ring-focus-dark/30 focus:ring-offset-0 cursor-pointer transition-colors"
                      />
                      <span className="text-[12px] text-text-secondary dark:text-text-secondary-dark group-hover:text-text-secondary dark:group-hover:text-text-secondary-dark transition-colors leading-relaxed">
                        I agree to the{' '}
                        <a
                          href="#"
                          className="text-primary dark:text-primary-dark hover:text-primary dark:hover:text-primary-dark transition-colors font-medium"
                        >
                          Terms of Service
                        </a>{' '}
                        and{' '}
                        <a
                          href="#"
                          className="text-primary dark:text-primary-dark hover:text-primary dark:hover:text-primary-dark transition-colors font-medium"
                        >
                          Privacy Policy
                        </a>
                      </span>
                    </label>
                    {errors.acceptTerms && (
                      <motion.p
                        initial={{ }}
                        animate={{ }}
                        className="text-[10px] text-danger dark:text-danger-dark mt-1"
                      >
                        {errors.acceptTerms}
                      </motion.p>
                    )}
                  </div>

                  <motion.button
                    type="submit"
                    disabled={loading || anyError}
                    className="relative w-full h-[52px] rounded-2xl bg-primary dark:bg-primary-dark text-white text-[14px] font-semibold  disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center gap-2.5 shadow-lg shadow-primary/25 dark:shadow-primary-dark/25 hover:shadow-primary/35 dark:shadow-primary-dark/35"
                    aria-label="Create your account"
                  >
                    {loading ? (
                      <div
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
                        role="status"
                      />
                    ) : (
                      <>
                        Create Account
                        <FiArrowRight size={16} />
                      </>
                    )}
                  </motion.button>
                </motion.form>

                <motion.div
                  className="mt-7"
                  initial={{ }}
                  animate={{ }}
                  transition={{ }}
                >
                  <Suspense fallback={null}>
                    <SocialLoginButtons />
                  </Suspense>
                </motion.div>

                <motion.p
                  className="mt-8 text-center text-[13px] text-text-secondary dark:text-text-secondary-dark"
                  initial={{ }}
                  animate={{ }}
                  transition={{ }}
                >
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    className="text-primary dark:text-primary-dark hover:text-primary dark:hover:text-primary-dark font-semibold transition-colors"
                  >
                    Sign in
                  </Link>
                </motion.p>

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
