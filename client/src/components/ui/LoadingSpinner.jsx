import { motion } from 'framer-motion';

export default function LoadingSpinner({ size = 'md', className = '', ...props }) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-3',
    xl: 'w-14 h-14 border-4',
  };

  return (
    <motion.div
      animate={{}}
      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
      className={`rounded-full border-border dark:border-border-dark border-t-primary dark:border-t-primary-dark ${sizes[size]} ${className}`}
      role="status"
      aria-label="Loading"
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </motion.div>
  );
}
