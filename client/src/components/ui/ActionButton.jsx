import { FiChevronRight } from 'react-icons/fi';
import { cn } from '../../theme/utilities';

export default function ActionButton({ icon: Icon, label, description, onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={cn('glass-surface interactive flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-surface-elevated/70 dark:hover:bg-surface-elevated-dark/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 dark:focus-visible:ring-focus-dark/50', className)}
      type="button"
    >
      {Icon && (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/12 dark:bg-primary-dark/12 text-primary dark:text-primary-dark">
          <Icon size={16} aria-hidden="true" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-body font-medium text-text-primary dark:text-text-primary-dark">{label}</span>
        {description && <span className="mt-0.5 block text-label text-text-secondary dark:text-text-secondary-dark">{description}</span>}
      </span>
      <FiChevronRight size={16} className="shrink-0 text-text-muted dark:text-text-muted-dark" aria-hidden="true" />
    </button>
  );
}
