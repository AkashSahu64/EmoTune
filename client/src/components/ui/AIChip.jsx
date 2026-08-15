import { FiZap } from 'react-icons/fi';
import { cn } from '../../theme/utilities';

const sizes = {
  sm: 'h-7 px-2.5 text-meta rounded-md gap-1',
  md: 'h-8 px-3 text-label rounded-lg gap-1.5',
  lg: 'h-10 px-4 text-body rounded-lg gap-2',
};

export default function AIChip({ label, onClick, active, className = '', size = 'sm' }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'interactive inline-flex items-center border font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50',
        active ? 'border-ai bg-ai text-white' : 'border-ai/20 bg-ai/10 text-ai hover:bg-ai/15',
        sizes[size] || sizes.sm,
        className,
      )}
      type="button"
    >
      <FiZap size={size === 'sm' ? 10 : size === 'md' ? 12 : 14} aria-hidden="true" />
      {label}
    </button>
  );
}
