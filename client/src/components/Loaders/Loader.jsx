
import { motion } from 'framer-motion';

export default function Loader({ fullScreen = false, size = 'md', text = '' }) {
  const sizeMap = { sm: 'w-6 h-6', md: 'w-10 h-10', lg: 'w-16 h-16' };

  const content = (
    <div className="flex flex-col items-center justify-center gap-3" role="status" aria-label={text || 'Loading'}>
      <div
        className={`${sizeMap[size]} relative animate-spin`}
        aria-hidden="true"
      >
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary dark:border-t-primary-dark" />
        <div className="absolute inset-1 rounded-full border-2 border-transparent border-r-secondary dark:border-r-secondary-dark" />
        <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-warning dark:border-b-warning-dark" />
      </div>
      {text && (
        <p className="text-sm text-text-secondary dark:text-text-secondary-dark">
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background dark:bg-background-dark z-50">
        {content}
      </div>
    );
  }

  return content;
}

export function ShimmerCard({ lines = 3 }) {
  return (
    <div className="bg-surface dark:bg-surface-dark backdrop-blur-glass border border-border dark:border-border-dark rounded-2xl p-4 space-y-3" aria-hidden="true">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full shimmer-bg" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 rounded shimmer-bg" />
          <div className="h-2 w-16 rounded shimmer-bg" />
        </div>
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 rounded shimmer-bg"
          style={{ width: `${70 + Math.random() * 30}%` }}
        />
      ))}
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 p-1" aria-label="Someone is typing" role="status">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-[6px] h-[6px] rounded-full bg-text-secondary dark:bg-text-secondary-dark animate-fade-in"
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export function ThinkingShimmer() {
  return (
    <div
      className="flex items-center gap-2 px-2 py-1"
      role="status"
      aria-label="AI is thinking"
    >
      <div className="w-5 h-5 rounded-full shimmer-bg" aria-hidden="true" />
      <div className="flex gap-1" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-[6px] h-[6px] rounded-full bg-primary dark:bg-primary-dark animate-pulse"
          />
        ))}
      </div>
      <span className="text-xs text-text-secondary dark:text-text-secondary-dark">AI is thinking...</span>
    </div>
  );
}
