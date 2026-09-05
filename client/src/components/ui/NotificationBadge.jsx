import { motion, AnimatePresence } from 'framer-motion';

export default function NotificationBadge({ count, className = '', size = 'sm' }) {
  const sizes = { sm: 'min-w-[18px] h-[18px] text-[10px]', md: 'min-w-[22px] h-[22px] text-xs' };

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.span
          initial={{}}
          animate={{}}
          exit={{}}
          className={`inline-flex items-center justify-center px-1 rounded-full bg-primary dark:bg-primary-dark text-white font-bold ${sizes[size]} ${className}`}
          aria-label={`${count} unread`}
        >
          {count > 99 ? '99+' : count}
        </motion.span>
      )}
    </AnimatePresence>
  );
}
