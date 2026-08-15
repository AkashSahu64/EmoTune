import { useState, useCallback, useMemo, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "../hooks/useAuth";
import { toast } from "sonner";
import {
  FiMail,
  FiLock,
  FiEye,
  FiEyeOff,
  FiArrowRight,
  FiUser,
  FiSmartphone,
} from "react-icons/fi";
import SEO from "../components/SEO/SEO";
import BrandShowcase from "../components/auth/BrandShowcase";
import TrustBadges from "../components/auth/TrustBadges";
import AuthFooter from "../components/auth/AuthFooter";
import { WebPageSchema, BreadcrumbSchema } from "../utils/schema";
import { Input, FormField, FormCard } from "../components/ui/Form";

const SocialLoginButtons = lazy(
  () => import("../components/auth/SocialLoginButtons"),
);

const loginSchema = WebPageSchema({
  title: "Sign In - Emotune",
  description: "Sign in to your Emotune account.",
  url: "https://emotune.app/login",
  datePublished: "2024-01-01",
  dateModified: new Date().toISOString(),
});

const breadcrumbSchema = BreadcrumbSchema({
  items: [
    { name: "Home", path: "/" },
    { name: "Sign In", path: "/login" },
  ],
});

const LOGIN_MODES = [
  {
    key: "email",
    label: "Email",
    icon: FiMail,
    placeholder: "john@example.com",
    type: "email",
    autoComplete: "email",
  },
  {
    key: "username",
    label: "Username",
    icon: FiUser,
    placeholder: "johndoe",
    type: "text",
    autoComplete: "username",
  },
  {
    key: "phone",
    label: "Phone",
    icon: FiSmartphone,
    placeholder: "+1 555 123 4567",
    type: "tel",
    autoComplete: "tel",
  },
];

function detectMode(value) {
  if (value.includes("@")) return "email";
  if (/^\+/.test(value.trim())) return "phone";
  return "username";
}

export default function LoginPage() {
  const [loginMode, setLoginMode] = useState("email");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [focusedField, setFocusedField] = useState(null);
  const { login } = useAuth();

  const activeMode = useMemo(() => {
    if (identifier.length > 0) return detectMode(identifier);
    return loginMode;
  }, [identifier, loginMode]);

  const currentMode = useMemo(
    () => LOGIN_MODES.find((m) => m.key === activeMode),
    [activeMode],
  );

  const switchMode = useCallback((mode) => {
    setLoginMode(mode);
    setIdentifier("");
    setErrors({});
  }, []);

  const handleIdentifierChange = useCallback((e) => {
    setIdentifier(e.target.value);
    setErrors((prev) => {
      if (!prev.identifier) return prev;
      const next = { ...prev };
      delete next.identifier;
      return next;
    });
  }, []);

  const handlePasswordChange = useCallback((e) => {
    setPassword(e.target.value);
    setErrors((prev) => {
      if (!prev.password) return prev;
      const next = { ...prev };
      delete next.password;
      return next;
    });
  }, []);

  const handleBlur = useCallback(() => setFocusedField(null), []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const errs = {};
      if (!identifier.trim())
        errs.identifier = "Please enter your login details";
      if (!password) errs.password = "Password is required";
      setErrors(errs);
      if (Object.keys(errs).length > 0) return;

      try {
        setLoading(true);
        const payload = { password, rememberMe };
        if (activeMode === "email") payload.email = identifier.trim();
        else if (activeMode === "phone")
          payload.phone = identifier.replace(/\s/g, "");
        else payload.username = identifier.trim();

        await login(payload);
        toast.success("Welcome back!");
      } catch (err) {
        const message = err.code === "ECONNABORTED"
          ? "Login request timed out. Please try again."
          : !err.response
            ? "Unable to reach the server. Please check your connection."
            : err.response?.data?.error || "Login failed";
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    [identifier, password, rememberMe, activeMode, login],
  );

  const inputState = useCallback(
    (field) => {
      if (errors[field]) return "error";
      if (focusedField === field) return "focused";
      return "default";
    },
    [errors, focusedField],
  );

  const anyError = Object.keys(errors).length > 0;

  return (
    <>
      <SEO
        title="Sign In"
        description="Sign in to your Emotune account."
        keywords="login, sign in, Emotune, AI chat"
        canonical="https://emotune.app/login"
        noIndex
      />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(loginSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
      </Helmet>

      <div className="min-h-screen flex bg-transparent">
        <BrandShowcase />

        <div className="flex-1 flex items-center justify-center px-2 py-4 bg-transparent relative overflow-hidden">
          <FormCard maxWidth="max-w-[520px]">
            <motion.div
              className="auth-surface-card w-full max-w-[520px] rounded-3xl border border-border/60 bg-surface/40 backdrop-blur-glass backdrop-blur-md px-3 lg:px-8 py-6 shadow-lg shadow-black/20 relative overflow-hidden"
              initial={{ }}
              animate={{ }}
              transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <div className="relative z-10">
                <div className="text-center mb-6">
                  <Link
                    to="/"
                    aria-label="Go to homepage"
                    className="inline-block"
                  >
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
                    className="text-4xl font-bold text-text-primary tracking-tight"
                    initial={{ }}
                    animate={{ }}
                    transition={{ }}
                  >
                    Welcome back
                  </motion.h1>
                  <motion.p
                    className="text-[14px] text-text-secondary mt-1"
                    initial={{ }}
                    animate={{ }}
                    transition={{ }}
                  >
                    Sign in to continue your chat
                  </motion.p>
                </div>

                <motion.form
                  onSubmit={handleSubmit}
                  className="space-y-4"
                  aria-label="Login form"
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
                      id="login-identifier"
                      type={currentMode.type}
                      value={identifier}
                      onChange={handleIdentifierChange}
                      onFocus={() => setFocusedField("identifier")}
                      onBlur={handleBlur}
                      placeholder={currentMode.placeholder}
                      autoComplete={currentMode.autoComplete}
                      state={inputState("identifier")}
                      autoFocus
                      ariaRequired
                    /> 
                  </FormField>
                  <div className="flex gap-1.5 translate-y-[-10px]">
                      {LOGIN_MODES.map((mode) => {
                        const ModeIcon = mode.icon;
                        const isActive = activeMode === mode.key;
                        return (
                          <button
                            key={mode.key}
                            type="button"
                            onClick={() => switchMode(mode.key)}
                            className={`flex items-center gap-1.5 px-1 py-0.5 rounded-md text-[10px] font-medium transition-colors duration-200 ${
                              isActive
                                ? "bg-primary/10 text-primary border border-primary/20"
                                : "text-text-muted hover:text-text-secondary hover:bg-surface-elevated backdrop-blur-glass border border-transparent"
                            }`}
                            aria-label={`Sign in with ${mode.label}`}
                            title={mode.label}
                          >
                            <ModeIcon size={11} />
                            {mode.label}
                          </button>
                        );
                      })}
                    </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label
                        htmlFor="login-password"
                        className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider"
                      >
                        Password
                      </label>
                      <Link
                        to="/forgot-password"
                        className="text-[11px] text-primary hover:text-primary transition-colors font-medium"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <FiLock
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none z-10"
                        size={16}
                      />
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={handlePasswordChange}
                        onFocus={() => setFocusedField("password")}
                        onBlur={handleBlur}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        state={inputState("password")}
                        className="pr-11"
                        ariaRequired
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-secondary transition-colors"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <FiEyeOff size={16} />
                        ) : (
                          <FiEye size={16} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-border bg-surface backdrop-blur-glass text-primary focus:ring-focus/30 focus:ring-offset-0 cursor-pointer transition-colors"
                      />
                      <span className="text-[12px] text-text-secondary group-hover:text-text-secondary transition-colors">
                        Remember this device
                      </span>
                    </label>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={loading || anyError}
                    className="relative w-full h-[46px] rounded-lg bg-primary text-white text-[14px] font-semibold  disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center gap-2.5 shadow-md hover:shadow-[var(--theme-primary)]/15"
                    aria-label="Sign in to your account"
                  >
                    {loading ? (
                      <div
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
                        role="status"
                      />
                    ) : (
                      <>
                        Sign In
                        <FiArrowRight size={16} />
                      </>
                    )}
                  </motion.button>
                </motion.form>

                <motion.div
                  className="mt-3"
                  initial={{ }}
                  animate={{ }}
                  transition={{ }}
                >
                  <Suspense fallback={null}>
                    <SocialLoginButtons />
                  </Suspense>
                </motion.div>

                <motion.p
                  className="mt-6 text-center text-[13px] text-text-secondary"
                  initial={{ }}
                  animate={{ }}
                  transition={{ }}
                >
                  Don&apos;t have an account?{" "}
                  <Link
                    to="/signup"
                    className="text-primary hover:text-primary font-semibold transition-colors"
                  >
                    Create one
                  </Link>
                </motion.p>

                <motion.div
                  className="hidden sm:block mt-4 pt-3 border-t border-border/50"
                  initial={{ }}
                  animate={{ }}
                  transition={{ }}
                >
                  <TrustBadges />
                </motion.div>
                <motion.div
                  className="hidden sm:block mt-2"
                  initial={{ }}
                  animate={{ }}
                  transition={{ }}
                >
                  <AuthFooter />
                </motion.div>

                <motion.div
                  className="block sm:hidden mt-4 pt-3 lg:pt-0 border-t border-border/50"
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
