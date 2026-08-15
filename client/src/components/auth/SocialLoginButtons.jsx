import { useState, useEffect, memo } from "react";
import { toast } from "sonner";
import api from "../../services/api";
import { FcGoogle } from "react-icons/fc";


function SocialLoginButtons() {
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [authorizationUrl, setAuthorizationUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    api
      .get("/identity/auth/oauth/providers")
      .then(({ data }) => {
        if (!mounted) return;
        if (data.data?.providers?.length > 0) {
          const google = data.data.providers.find(
            (p) => p.provider === "google",
          );
          if (google) {
            setGoogleEnabled(true);
            setAuthorizationUrl(google.authorizationUrl);
          }
        }
      })
      .catch(() => setError("OAuth unavailable"))
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleGoogleLogin = () => {
    if (!authorizationUrl) {
      toast.error(
        "Google sign-in is not configured. Set GOOGLE_OAUTH_CLIENT_ID in your .env file.",
      );
      return;
    }
    setAuthLoading(true);
    const state = new URL(authorizationUrl).searchParams.get('state');
    sessionStorage.setItem(
      "oauth_state",
      JSON.stringify({ provider: "google", state }),
    );
    window.location.href = authorizationUrl;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-[var(--theme-border)]" />
        <span className="text-[12px] text-text-secondary font-medium tracking-wide">
          or continue with
        </span>
        <div className="flex-1 h-px bg-[var(--theme-border)]" />
      </div>

      <button
        onClick={handleGoogleLogin}
        disabled={authLoading}
        className="group relative w-full flex items-center justify-center gap-3 px-4 py-[12px] rounded-lg bg-surface-elevated backdrop-blur-glass border border-border hover:border-primary/40 hover:bg-surface-elevated backdrop-blur-glass transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-focus/20 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg)]"
        aria-label="Continue with Google"
        type="button"
      >
        {authLoading ? (
          <div
            className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"
            role="status"
          />
        ) : (
          <>
            {<FcGoogle size={20} />}
            <span className="text-[14px] font-medium text-text-secondary group-hover:text-text-primary transition-colors">
              Continue with Google
            </span>
          </>
        )}
      </button>

      {error && (
        <p className="text-[10px] text-danger text-center">{error}</p>
      )}
    </div>
  );
}

export default memo(SocialLoginButtons);
