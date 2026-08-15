import { motion, AnimatePresence } from 'framer-motion';

export default function AnimatedCounter({ count, className = '' }) {
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={count}
        initial={{ }}
        animate={{ }}
        exit={{ }}
        transition={{ duration: 0.15 }}
        className={className}
      >
        {count}
      </motion.span>
    </AnimatePresence>
  );
}
