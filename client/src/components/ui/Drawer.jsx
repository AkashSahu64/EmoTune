import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

export default function Drawer({ isOpen, onClose, children, className = '' }) {
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose?.(); };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <motion.div
            initial={{ }} animate={{ }} exit={{ }}
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
          />
          <motion.div
            initial={{}}
            animate={{}}
            exit={{}}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`absolute left-0 top-0 bottom-0 w-[85vw] max-w-sm bg-surface dark:bg-surface-dark backdrop-blur-glass border-r border-border dark:border-border-dark shadow-floating dark:shadow-floating-dark ${className}`}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
