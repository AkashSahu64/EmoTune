import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const FormError = memo(function FormError({ message, name }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.p
          key={name || message}
          initial={{ }}
          animate={{ }}
          exit={{ }}
          transition={{ duration: 0.15 }}
          className="text-[10px] text-danger dark:text-danger-dark mt-1"
          role="alert"
        >
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  );
});

export default FormError;
