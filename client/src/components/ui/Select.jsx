import { FiChevronDown } from 'react-icons/fi';
import { cn } from '../../theme/utilities';

export default function Select({ value, onChange, options, disabled, label, className = '' }) {
  return (
    <div className={cn('relative', className)}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        aria-label={label || 'Select option'}
        className="glass-input h-10 w-full cursor-pointer appearance-none rounded-lg px-3 pr-8 text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40 dark:focus-visible:ring-focus-dark/40 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <FiChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted dark:text-text-muted-dark" aria-hidden="true" />
    </div>
  );
}
