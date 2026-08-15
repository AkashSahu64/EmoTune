export default function Skeleton({ className = '', width, height, rounded = 'xl', lines = 0 }) {
  if (lines > 0) {
    return (
      <div className="space-y-3 animate-pulse" aria-hidden="true">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`shimmer-bg ${rounded === 'full' ? 'rounded-full' : `rounded-${rounded}`}`}
            style={{
              height: height || 12,
              width: width || `${70 + Math.random() * 30}%`,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`shimmer-bg animate-pulse ${rounded === 'full' ? 'rounded-full' : `rounded-${rounded}`} ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}
