import { FiChevronRight } from 'react-icons/fi';
import { cn } from '../../theme/utilities';

export default function ActionButton({ icon: Icon, label, description, onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={cn('glass-surface interactive flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-surface-elevated/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50', className)}
      type="button"
    >
      {Icon && (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
          <Icon size={16} aria-hidden="true" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-body font-medium text-text-primary">{label}</span>
        {description && <span className="mt-0.5 block text-label text-text-secondary">{description}</span>}
      </span>
      <FiChevronRight size={16} className="shrink-0 text-text-muted" aria-hidden="true" />
    </button>
  );
}
