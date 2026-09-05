import { motion, AnimatePresence } from 'framer-motion';
import { useState, Children } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

export default function Carousel({ children, className = '' }) {
  const [current, setCurrent] = useState(0);
  const items = Children.toArray(children);
  const total = items.length;

  if (total === 0) return null;

  const next = () => setCurrent((c) => (c + 1) % total);
  const prev = () => setCurrent((c) => (c - 1 + total) % total);

  return (
    <div className={`relative ${className}`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ }}
          animate={{ }}
          exit={{ }}
          transition={{ duration: 0.2 }}
        >
          {items[current]}
        </motion.div>
      </AnimatePresence>
      {total > 1 && (
        <div className="flex items-center justify-between mt-3">
          <button onClick={prev} className="p-1.5 bg-surface dark:bg-surface-dark backdrop-blur-glass border border-border dark:border-border-dark rounded-lg hover:bg-hover/[0.07] dark:hover:bg-hover-dark/[0.07] text-text-secondary dark:text-text-secondary-dark" aria-label="Previous">
            <FiChevronLeft size={14} />
          </button>
          <div className="flex gap-1.5">
            {Array.from({ length: total }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${i === current ? 'bg-primary dark:bg-primary-dark w-4' : 'bg-border dark:bg-border-dark'}`}
                aria-label={`Go to item ${i + 1}`}
              />
            ))}
          </div>
          <button onClick={next} className="p-1.5 bg-surface dark:bg-surface-dark backdrop-blur-glass border border-border dark:border-border-dark rounded-lg hover:bg-hover/[0.07] dark:hover:bg-hover-dark/[0.07] text-text-secondary dark:text-text-secondary-dark" aria-label="Next">
            <FiChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
