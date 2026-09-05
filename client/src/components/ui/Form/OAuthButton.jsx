import { memo } from 'react';

const GoogleIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#DC2626" d="M5.27 12c0-.82.14-1.61.38-2.35L2.2 7.09A11.95 11.95 0 0 0 0 12c0 1.97.48 3.84 1.32 5.48l3.45-2.56A7.16 7.16 0 0 1 5.27 12"/>
    <path fill="#4285F4" d="M12 4.91c1.77 0 3.37.61 4.63 1.8l3.48-3.48A11.95 11.95 0 0 0 12 0C7.64 0 3.85 2.55 1.95 6.33l3.7 2.32A7.16 7.16 0 0 1 12 4.91"/>
    <path fill="#D97706" d="M5.27 12c0-.82.14-1.61.38-2.35l-3.7-2.32A11.9 11.9 0 0 0 .8 12c0 1.97.48 3.84 1.32 5.48l3.45-2.56A7.16 7.16 0 0 1 5.27 12"/>
    <path fill="#16A34A" d="M12 19.09c-1.77 0-3.37-.61-4.63-1.8l-3.48 3.48A11.95 11.95 0 0 0 12 24c3.3 0 6.27-1.34 8.44-3.48l-3.6-2.64C13.6 18.13 12.87 19.09 12 19.09"/>
    <path fill="#4285F4" d="M20.44 20.52c1.86-2.04 3.01-4.76 3.36-7.7H12v-3.5h11.84c.1.64.16 1.29.16 1.95 0 3.23-1.02 6.22-2.72 8.63l-3.65-2.64c.55-.82.91-1.78 1.08-2.84H12v-2.3h8.17c-.16.56-.42 1.1-.77 1.6l-3.6-2.64z"/>
  </svg>
);

const OAuthButton = memo(function OAuthButton({
  provider = 'google',
  onClick,
  loading = false,
  disabled = false,
  label = 'Continue with Google',
  className = '',
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`group relative w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-surface-elevated dark:bg-surface-elevated-dark backdrop-blur-glass border border-border dark:border-border-dark hover:border-primary/40 dark:hover:border-primary-dark/40 hover:bg-surface-elevated dark:hover:bg-surface-elevated-dark backdrop-blur-glass transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-focus/30 dark:focus:ring-focus-dark/30 focus:ring-offset-2 focus:ring-offset-background dark:ring-offset-background-dark ${className}`}
      aria-label={label}
      type="button"
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-primary dark:border-primary-dark border-t-transparent rounded-full animate-spin" role="status" />
      ) : (
        <>
          {GoogleIcon}
          <span className="text-[13px] font-medium text-text-secondary dark:text-text-secondary-dark group-hover:text-text-primary dark:group-hover:text-text-primary-dark transition-colors">
            {label}
          </span>
        </>
      )}
    </button>
  );
});

export default OAuthButton;
