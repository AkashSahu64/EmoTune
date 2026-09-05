/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],

  theme: {
    extend: {
      colors: {
        primary: "#3B5BFF",
        "primary-hover": "#E8EEFF",
        "primary-light": "#F1F3F5",
        "primary-active": "#2945D1",
        "primary-dark": "#4C6FFF",
        "primary-hover-dark": "#5B7BFF",
        "primary-active-dark": "#3E5DDB",
        secondary: "#6B7280",
        "secondary-dark": "#CBD5E1",
        background: "#F8F9FB",
        "background-dark": "#0B0F19",
        surface: "#FFFFFF",
        "surface-dark": "#111827",
        "surface-muted": "#F3F4F6",
        "surface-muted-dark": "#182033",
        "surface-glass": "#FFFFFF",
        "surface-glass-dark": "#111827",
        "surface-elevated": "#FFFFFF",
        "surface-elevated-dark": "#182033",
        "surface-floating": "#FFFFFF",
        "surface-floating-dark": "#182033",
        border: "#E5E7EB",
        "border-dark": "#263248",
        "border-muted": "#cbcbcc",
        "border-muted-dark": "#334155",
        "border-strong": "#D1D5DB",
        "border-strong-dark": "#475569",
        "border-glass": "#E5E7EB",
        "border-glass-dark": "#334155",
        "border-focus": "#3B5BFF",
        "border-focus-dark": "#4C6FFF",
        "border-error": "#DC2626",
        "border-error-dark": "#F87171",
        "border-success": "#16A34A",
        "border-success-dark": "#34D399",
        "text-primary": "#111827",
        "text-primary-dark": "#F8FAFC",
        "text-secondary": "#374151",
        "text-secondary-dark": "#CBD5E1",
        "text-muted": "#6B7280",
        "text-muted-dark": "#94A3B8",
        placeholder: "#9CA3AF",
        "placeholder-dark": "#94A3B8",
        "on-primary": "#FFFFFF",
        "on-primary-dark": "#FFFFFF",
        "on-surface": "#111827",
        "on-surface-dark": "#F8FAFC",
        success: "#16A34A",
        "success-dark": "#34D399",
        warning: "#D97706",
        "warning-dark": "#FBBF24",
        danger: "#DC2626",
        "danger-dark": "#F87171",
        info: "#3B5BFF",
        "info-dark": "#60A5FA",
        online: "#22C55E",
        "online-dark": "#34D399",
        offline: "#9CA3AF",
        "offline-dark": "#6B7280",
        ai: "#7C3AED",
        "ai-dark": "#A78BFA",
        ghost: "#0891B2",
        "ghost-dark": "#22D3EE",
        memory: "#D97706",
        "memory-dark": "#FBBF24",
        bookmark: "#3B5BFF",
        "bookmark-dark": "#4C6FFF",
        selection: "#3B5BFF",
        "selection-dark": "#4C6FFF",
        hover: "#111827",
        "hover-dark": "#FFFFFF",
        focus: "#3B5BFF",
        "focus-dark": "#4C6FFF",
        disabled: "#9CA3AF",
        "disabled-dark": "#6B7280",
        typing: "#7C3AED",
        "typing-dark": "#A78BFA",
        mention: "#D97706",
        "mention-dark": "#FBBF24",
        notification: "#3B5BFF",
        "notification-dark": "#4C6FFF",
        "chat-incoming": "#FFFFFF",
        "chat-incoming-dark": "#182033",
        "chat-outgoing": "#3B5BFF",
        "chat-outgoing-dark": "#4C6FFF",
        "chat-incoming-text": "#111827",
        "chat-incoming-text-dark": "#F8FAFC",
        "chat-outgoing-text": "#FFFFFF",
        "chat-meta": "#6B7280",
        "chat-meta-dark": "#CBD5E1",
        "chat-background": "#F5F6F8",
        "chat-background-dark": "#0B0F19",
        "chat-surface": "#FFFFFF",
        "chat-surface-dark": "#111827",
        "chat-surface-elevated": "#FFFFFF",
        "chat-surface-elevated-dark": "#182033",
        "chat-reply": "#FFFFFF5C",
        "chat-reply-dark": "#1820335C",
        "chat-reply-border": "#3B5BFFF2",
        "chat-reply-border-dark": "#4C6FFFF2",
        "chat-reaction": "#FFFFFFEB",
        "chat-reaction-dark": "#182033EB",
        "chat-reaction-active": "#3B5BFF26",
        "chat-reaction-active-dark": "#4C6FFF26",
        "chat-composer": "#FFFFFF",
        "chat-composer-dark": "#182033",
        "chat-composer-text": "#111827",
        "chat-composer-text-dark": "#F8FAFC",
        "chat-composer-placeholder": "#9CA3AF",
        "chat-composer-placeholder-dark": "#94A3B8",
        "chat-header": "#FFFFFF",
        "chat-header-dark": "#111827",
        "chat-header-text": "#111827",
        "chat-header-text-dark": "#F8FAFC",
        "chat-sidebar": "#FFFFFF",
        "chat-sidebar-dark": "#111827",
        "chat-sidebar-text": "#111827",
        "chat-sidebar-text-dark": "#F8FAFC",
        "chat-divider": "#E5E7EB",
        "chat-divider-dark": "#263248",
        viral: {
          pink: "#3B5BFF",
          purple: "#3150E8",
          orange: "#4C6FFF",
          blue: "#3B5BFF",
        },
        accent: {
          DEFAULT: "#3B5BFF",
          light: "#4C6FFF",
          soft: "#EEF1FF",
        },
        card: "#FFFFFF",
        "card-dark": "#111827",
        muted: "#F3F4F6",
        "muted-dark": "#182033",
        foreground: "#111827",
        "foreground-dark": "#F8FAFC",
        mutedForeground: "#7B7B7B",
        "mutedForeground-dark": "#9CA3AF",
      },

      spacing: {
        18: "4.5rem",
        22: "5.5rem",
      },

      opacity: {
        2: "0.02",
        3: "0.03",
        4: "0.04",
        8: "0.08",
        12: "0.12",
        14: "0.14",
        16: "0.16",
      },

      backgroundImage: {
        app: "linear-gradient(145deg, #FFFFFF 0%, #F5F6F8 100%)",
        "app-dark":
          "linear-gradient(145deg, #0B0F19 0%, #111827 100%)",
        landing:
          "linear-gradient(145deg, #FFFFFF 0%, #F5F6F8 100%)",
        "landing-dark":
          "linear-gradient(145deg, #0B0F19 0%, #111827 100%)",
        "landing-dark-page":
          "linear-gradient(145deg, #0B0F19 0%, #111827 100%)",
        "landing-dark-hero":
          "linear-gradient(145deg, #0B0F19 0%, #111827 100%)",
        "landing-dark-features":
          "linear-gradient(145deg, #0B0F19 0%, #111827 100%)",
        "landing-dark-ai":
          "linear-gradient(145deg, #0B0F19 0%, #111827 100%)",
        "landing-dark-how":
          "linear-gradient(145deg, #0B0F19 0%, #111827 100%)",
        "landing-dark-light":
          "linear-gradient(145deg, #0B0F19 0%, #111827 100%)",
        "landing-dark-cta":
          "linear-gradient(145deg, #0B0F19 0%, #111827 100%)",
        "landing-dark-footer":
          "linear-gradient(145deg, #0B0F19 0%, #111827 100%)",
        "hero-social":
          "linear-gradient(135deg, #3B5BFF 0%, #3150E8 55%, #4C6FFF 100%)",
        "login-hero":
          "linear-gradient(180deg, #FFFFFF 0%, #F5F6F8 100%)",
        "story-ring": "linear-gradient(45deg, #3B5BFF, #4C6FFF)",
        "dark-overlay": "linear-gradient(to top, #000000B3, transparent)",
        "glass-shine": "linear-gradient(145deg, #FFFFFF0F, transparent)",
      },

      fontFamily: {
        sans: [
          "Inter",
          "SF Pro Display",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        mono: ["JetBrains Mono", "SFMono-Regular", "Fira Code", "monospace"],
      },

      fontSize: {
        meta: ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.01em" }],
        label: ["0.75rem", { lineHeight: "1rem", letterSpacing: "0.005em" }],
        caption: [
          "0.8125rem",
          { lineHeight: "1.125rem", letterSpacing: "0.005em" },
        ],
        body: ["0.875rem", { lineHeight: "1.375rem" }],
        input: ["0.875rem", { lineHeight: "1.25rem" }],
        button: [
          "0.875rem",
          { lineHeight: "1.25rem", letterSpacing: "0.005em" },
        ],
        title: ["1rem", { lineHeight: "1.5rem", letterSpacing: "-0.01em" }],
        heading: [
          "1.25rem",
          { lineHeight: "1.75rem", letterSpacing: "-0.02em" },
        ],
        display: [
          "1.75rem",
          { lineHeight: "2.125rem", letterSpacing: "-0.03em" },
        ],
      },

      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "scale-in": "fadeIn 140ms cubic-bezier(0.2, 0, 0, 1)",
        shimmer: "softPulse 1.8s ease-in-out infinite",
        typing: "softPulse 1.2s ease-in-out infinite",
        "ping-slow": "softPulse 2s ease-in-out infinite",
        "float-slow": "float 6s ease-in-out infinite",
        "pulse-soft": "pulseSoft 2.5s ease-in-out infinite",
        "bounce-soft": "bounceSoft 1.5s infinite",
        "glow-pulse": "glowPulse 2s ease-in-out infinite",
      },

      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: {
          "0%": { transform: "translateY(12px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        pulseSoft: { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.75" } },
        softPulse: { "0%,100%": { opacity: "0.45" }, "50%": { opacity: "1" } },
        bounceSoft: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        glowPulse: {
          "0%,100%": { boxShadow: "0 0 15px #3B5BFF66" },
          "50%": { boxShadow: "0 0 25px #3B5BFFB3" },
        },
      },

      boxShadow: {
        xs: "0 1px 2px #0000000A",
        soft: "0 4px 20px #0F172A0F",
        premium: "0 4px 20px #0F172A0F",
        "premium-dark": "0 10px 30px #00000099",
        glow: "0 0 25px #3B5BFF73",
        emerald: "0 0 25px #3B5BFF66",
        glass: "0 12px 36px #0F172A14, inset 0 1px 0 #FFFFFFB8",
        "glass-dark": "0 12px 36px #0000001F, inset 0 1px 0 #FFFFFF0E",
        floating: "0 28px 72px #0F172A26",
        "floating-dark": "0 28px 72px #0000003D",
        modal: "0 38px 110px #0F172A38",
        "modal-dark": "0 38px 110px #00000052",
      },

      borderRadius: { xs: "4px", xl2: "1.25rem", xl3: "1.75rem" },
      borderWidth: { 3: "3px" },
      backdropBlur: { glass: "18px", dialog: "24px" },
      transitionDuration: {
        instant: "80ms",
        fast: "120ms",
        normal: "180ms",
        slow: "260ms",
        drawer: "320ms",
        modal: "220ms",
      },
      transitionTimingFunction: { premium: "cubic-bezier(0.2, 0, 0, 1)" },
      width: { sidebar: "340px", "right-panel": "344px" },
      height: { "control-sm": "32px", control: "40px", "control-lg": "48px" },
      minHeight: {
        "control-sm": "32px",
        control: "40px",
        "control-lg": "48px",
      },
      zIndex: {
        base: "0",
        dock: "20",
        sidebar: "30",
        header: "40",
        dropdown: "50",
        modal: "60",
        toast: "70",
      },
    },
  },

  plugins: [
    function emotumeStyles({ addBase, addComponents, addUtilities }) {
      addBase({
        "*, *::before, *::after": { boxSizing: "border-box" },
        "*": { margin: "0", padding: "0" },
        ":root": {
          colorScheme: "light",
          "--sidebar-width": "340px",
          "--right-panel-width": "344px",
          "--motion-ease": "cubic-bezier(0.2, 0, 0, 1)",
        },
        ".dark": { colorScheme: "dark" },
        html: {
          minWidth: "320px",
          fontSize: "14px",
          textRendering: "optimizeLegibility",
        },
        body: {
          minWidth: "320px",
          minHeight: "100vh",
          fontFamily:
            'Inter, "SF Pro Text", ui-sans-serif, system-ui, sans-serif',
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
          backgroundColor: "#F8F9FB",
          color: "#111827",
          fontFeatureSettings: '"cv02", "cv03", "cv04", "cv11"',
          lineHeight: "1.5",
        },
        ".dark body": {
          backgroundColor: "#0B0F19",
          color: "#F8FAFC",
        },
        "button, input, textarea, select": { font: "inherit" },
        "::selection": {
          backgroundColor: "#3B5BFF",
          color: "#111827",
        },
        ".dark ::selection": {
          backgroundColor: "#4C6FFF",
          color: "#F8FAFC",
        },
        // ":focus-visible": {
        //   outline: "2px solid #3B5BFF",
        //   outlineOffset: "2px",
        // },
        // ".dark :focus-visible": {
        //   outlineColor: "#4C6FFF",
        // },
        // 'input[type="range"]::-webkit-slider-thumb, input[type="range"]::-moz-range-thumb':
        //   {
        //     width: "16px",
        //     height: "16px",
        //     border: "2px solid #FFFFFF",
        //     borderRadius: "9999px",
        //     backgroundColor: "#3B5BFF",
        //     cursor: "pointer",
        //   },
        // '.dark input[type="range"]::-webkit-slider-thumb, .dark input[type="range"]::-moz-range-thumb':
        //   {
        //     borderColor: "#182033",
        //     backgroundColor: "#4C6FFF",
        //   },
        "@media (prefers-reduced-motion: reduce)": {
          "*, *::before, *::after": {
            animationDuration: "0.01ms !important",
            animationIterationCount: "1 !important",
            scrollBehavior: "auto !important",
            transitionDuration: "0.01ms !important",
          },
        },
        'html[style*="--reduce-motion: reduce"] *, html[style*="--reduce-motion: reduce"] *::before, html[style*="--reduce-motion: reduce"] *::after':
          {
            animationDuration: "0.01ms !important",
            animationIterationCount: "1 !important",
            scrollBehavior: "auto !important",
            transitionDuration: "0.01ms !important",
          },
      });

      addUtilities({
        ".scrollbar-hide": {
          MsOverflowStyle: "none",
          scrollbarWidth: "none",
        },
        ".scrollbar-hide::-webkit-scrollbar": { display: "none" },
        ".scrollbar-glass": {
          scrollbarColor: "#D1D5DB transparent",
          scrollbarWidth: "thin",
        },
        ".scrollbar-glass::-webkit-scrollbar": { width: "5px", height: "5px" },
        ".scrollbar-glass::-webkit-scrollbar-track": {
          backgroundColor: "transparent",
        },
        ".scrollbar-glass::-webkit-scrollbar-thumb": {
          backgroundColor: "#D1D5DB",
          borderRadius: "9999px",
        },
        ".scrollbar-glass::-webkit-scrollbar-thumb:hover": {
          backgroundColor: "#9CA3AF",
        },
        ".dark .scrollbar-glass": { scrollbarColor: "#475569 transparent" },
        ".dark .scrollbar-glass::-webkit-scrollbar-thumb": {
          backgroundColor: "#475569",
        },
        ".dark .scrollbar-glass::-webkit-scrollbar-thumb:hover": {
          backgroundColor: "#94A3B8",
        },
      });

      addComponents({
        ".glass-surface": {
          "@apply border border-border bg-surface backdrop-blur-glass shadow-glass":
            {},
        },
        ".dark .glass-surface": {
          "@apply border-border-dark bg-surface-dark shadow-glass-dark": {},
        },
        ".glass-elevated": {
          "@apply border border-border bg-surface-elevated backdrop-blur-glass shadow-md":
            {},
        },
        ".dark .glass-elevated": {
          "@apply border-border-dark bg-surface-elevated-dark": {},
        },
        ".glass-floating": {
          "@apply border border-border bg-surface-floating backdrop-blur-glass shadow-floating":
            {},
        },
        ".dark .glass-floating": {
          "@apply border-border-dark bg-surface-floating-dark shadow-floating-dark":
            {},
        },
        ".glass-dialog": {
          "@apply border border-border bg-surface-floating backdrop-blur-dialog shadow-floating":
            {},
        },
        ".dark .glass-dialog": {
          "@apply border-border-dark bg-surface-floating-dark shadow-floating-dark":
            {},
        },
        ".glass-popover": {
          "@apply border border-border bg-surface-floating backdrop-blur-glass shadow-lg":
            {},
        },
        ".dark .glass-popover": {
          "@apply border-border-dark bg-surface-floating-dark": {},
        },
        // ".glass-input": {
        //   "@apply border border-border bg-surface-elevated text-text-primary backdrop-blur-sm":
        //     {},
        // },
        // ".glass-input::placeholder": { "@apply text-placeholder": {} },
        // ".glass-input:focus": { "@apply border-focus outline-none": {} },
        // ".dark .glass-input": {
        //   "@apply border-border-dark bg-surface-elevated-dark text-text-primary-dark":
        //     {},
        // },
        // ".dark .glass-input::placeholder": {
        //   "@apply text-placeholder-dark": {},
        // },
        // ".dark .glass-input:focus": { "@apply border-focus-dark": {} },
        ".interactive": { "@apply transition-colors duration-fast": {} },
        ".theme-transition": { "@apply transition-colors duration-normal": {} },
        ".shimmer-bg": { "@apply animate-pulse bg-surface-elevated": {} },
        ".dark .shimmer-bg": { "@apply bg-surface-elevated-dark": {} },
        ".landing-feature-icon": {
          color: "var(--feature-color)",
          backgroundColor:
            "color-mix(in srgb, var(--feature-color) 14%, transparent)",
        },
        ".app-main-shell": {
          position: "relative",
          isolation: "isolate",
        },
        ".app-main-shell > *, .app-chat-column > *": {
          position: "relative",
          zIndex: "1",
        },
      });
    },
  ],
};
