import { motion } from 'framer-motion';
import { FiMoon } from 'react-icons/fi';
import { Tooltip } from '../ui';

export default function SilentSendToggle({ isSilent, onToggle }) {
  return (
    <Tooltip content={isSilent ? 'Silent mode active' : 'Toggle silent mode'}>
      <motion.button
        onClick={onToggle}
        className={`relative p-2 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-focus dark:focus:ring-focus-dark ${
          isSilent
            ? 'bg-primary dark:bg-primary-dark text-white shadow-lg shadow-primary/20 dark:shadow-primary-dark/20'
            : 'text-text-secondary dark:text-text-secondary-dark hover:bg-hover/[0.07] dark:hover:bg-hover-dark/[0.07]'
        }`}
        aria-label={isSilent ? 'Disable silent mode' : 'Enable silent mode'}
        aria-pressed={isSilent}
        type="button"
      >
        <FiMoon size={16} />
        {isSilent && (
          <motion.span
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary dark:bg-primary-dark border-2 border-background dark:border-background-dark"
            initial={{}}
            animate={{}}
            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
          />
        )}
      </motion.button>
    </Tooltip>
  );
}
