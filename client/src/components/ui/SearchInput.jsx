import { FiSearch, FiX } from 'react-icons/fi';
import { cn } from '../../theme/utilities';

export default function SearchInput({ value, onChange, placeholder = 'Search...', className = '', ...props }) {
  return (
    <div className={cn('relative', className)} role="search">
      <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="glass-input h-10 w-full rounded-lg pl-10 pr-9 text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/30"
        {...props}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="interactive absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-text-muted hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40"
          type="button"
          aria-label="Clear search"
        >
          <FiX size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
