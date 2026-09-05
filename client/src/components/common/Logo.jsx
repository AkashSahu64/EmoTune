export default function Logo({ variant = 'full', size = 'md', className = '' }) {
  const sizeMap = {
    sm: { icon: 28, textH: 18, gap: 2 },
    md: { icon: 36, textH: 22, gap: 2.5 },
    lg: { icon: 44, textH: 28, gap: 3 },
    xl: { icon: 56, textH: 34, gap: 3.5 },
  };

  const s = sizeMap[size] || sizeMap.md;

  if (variant === 'icon') {
    return (
      <img
        src="/logo.png"
        alt="Emotune brand icon"
        className={`block ${className}`}
        style={{ width: s.icon, height: s.icon }}
      />
    );
  }

  if (variant === 'wordmark') {
    return (
      <img
        src="/textLogo.png"
        alt="Emotune"
        className={`block object-contain ${className}`}
        style={{ height: s.textH, width: 'auto' }}
      />
    );
  }

  return (
    <div className={`inline-flex items-center ${className}`} style={{ gap: s.gap }}>
      <img
        src="/logo.png"
        alt="Emotune brand icon"
        style={{ width: s.icon, height: s.icon }}
        className="block flex-shrink-0 object-contain"
      />
      <img
        src="/textLogo.png"
        alt="Emotune"
        style={{ height: s.textH, width: 'auto' }}
        className="block object-contain"
      />
    </div>
  );
}
