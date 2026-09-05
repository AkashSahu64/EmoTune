import { cn } from '../../theme/utilities';

export default function Toggle({ value, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={label || 'Toggle'}
      disabled={disabled}
      onClick={() => onChange(!value)}
      className={cn(
        'interactive relative h-[22px] w-11 shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 dark:focus-visible:ring-focus-dark/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:focus-visible:ring-offset-background-dark',
        disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
        value ? 'bg-primary dark:bg-primary-dark' : 'bg-border/40 dark:bg-border-dark/40',
      )}
    >
      <span className={cn('absolute top-0.5 size-[18px] rounded-full bg-white shadow-xs transition-[left] duration-fast ease-premium', value ? 'left-6' : 'left-0.5')} />
    </button>
  );
}
