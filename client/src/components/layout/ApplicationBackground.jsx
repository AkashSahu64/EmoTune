export default function ApplicationBackground({ children }) {
  return (
    <div className="app-background landing-derived-system" data-background-layer="application">
      <div className="app-background__aurora app-background__aurora--blue" aria-hidden="true" />
      <div className="app-background__aurora app-background__aurora--violet" aria-hidden="true" />
      <div className="app-background__aurora app-background__aurora--cyan" aria-hidden="true" />
      <div className="app-background__ribbon app-background__ribbon--violet" aria-hidden="true" />
      <div className="app-background__ribbon app-background__ribbon--cyan" aria-hidden="true" />
      <svg className="app-background__flow" viewBox="0 0 1440 900" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="emotune-flow-violet" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#312e81" stopOpacity="0" />
            <stop offset="0.35" stopColor="#7c3aed" stopOpacity="0.78" />
            <stop offset="0.62" stopColor="#c084fc" stopOpacity="0.9" />
            <stop offset="1" stopColor="#2563eb" stopOpacity="0.12" />
          </linearGradient>
          <linearGradient id="emotune-flow-cyan" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#312e81" stopOpacity="0.08" />
            <stop offset="0.42" stopColor="#2563eb" stopOpacity="0.8" />
            <stop offset="0.72" stopColor="#22d3ee" stopOpacity="0.9" />
            <stop offset="1" stopColor="#0e7490" stopOpacity="0" />
          </linearGradient>
          <filter id="emotune-flow-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
        </defs>
        <path className="app-background__flow-glow" d="M -140 170 C 170 30, 270 390, 610 420 S 1020 230, 1580 420" stroke="url(#emotune-flow-violet)" strokeWidth="86" fill="none" filter="url(#emotune-flow-glow)" />
        <path className="app-background__flow-line" d="M -140 170 C 170 30, 270 390, 610 420 S 1020 230, 1580 420" stroke="url(#emotune-flow-violet)" strokeWidth="18" fill="none" />
        <path className="app-background__flow-glow" d="M -120 730 C 220 600, 390 780, 650 650 S 1080 410, 1580 620" stroke="url(#emotune-flow-cyan)" strokeWidth="90" fill="none" filter="url(#emotune-flow-glow)" />
        <path className="app-background__flow-line" d="M -120 730 C 220 600, 390 780, 650 650 S 1080 410, 1580 620" stroke="url(#emotune-flow-cyan)" strokeWidth="20" fill="none" />
      </svg>
      <div className="app-background__content">{children}</div>
    </div>
  );
}
