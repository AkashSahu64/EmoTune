import { cn } from '../../theme/utilities';

const sizes = {
  xs: 'size-7 text-label',
  sm: 'size-8 text-body',
  md: 'size-10 text-base',
  lg: 'size-12 text-lg',
};

export default function IconButton({ icon: Icon, size = 'md', className = '', label, active, onClick, ...props }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        'interactive inline-flex items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 disabled:pointer-events-none disabled:opacity-40',
        active ? 'bg-selection/16 text-primary' : 'text-text-secondary hover:text-text-primary',
        sizes[size] || sizes.md,
        className,
      )}
      {...props}
    >
      <Icon size={size === 'xs' ? 14 : size === 'sm' ? 16 : size === 'md' ? 18 : 22} aria-hidden="true" />
    </button>
  );
}
