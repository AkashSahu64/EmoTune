import { cn } from '../../theme/utilities';

export default function ListItem({ avatar, title, subtitle, right, onClick, active, className = '', ...props }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'interactive flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus/50',
        active ? 'border border-primary/20 bg-selection/12' : 'border border-transparent hover:bg-hover/[0.07]',
        className,
      )}
      type="button"
      {...props}
    >
      {avatar && <div className="shrink-0">{avatar}</div>}
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-body font-medium', active ? 'text-primary' : 'text-text-primary')}>{title}</p>
        {subtitle && <p className="mt-0.5 truncate text-label text-text-secondary">{subtitle}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </button>
  );
}
