import { buttonVariants, controlBase } from '../../theme/variants';
import { cn } from '../../theme/utilities';

const sizes = {
  xs: 'h-7 px-2.5 text-label rounded-md',
  sm: 'h-8 px-3 text-label rounded-lg',
  md: 'h-10 px-4 text-body rounded-lg',
  lg: 'h-12 px-5 text-title rounded-xl',
};

export default function Button({
  children, variant = 'primary', size = 'md', className = '',
  icon: Icon, disabled, loading, ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'interactive inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium',
        controlBase,
        buttonVariants[variant] || buttonVariants.primary,
        sizes[size] || sizes.md,
        className,
      )}
      {...props}
    >
      {loading ? (
        <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
      ) : Icon ? (
        <Icon size={size === 'xs' ? 12 : size === 'sm' ? 14 : 16} aria-hidden="true" />
      ) : null}
      {children}
    </button>
  );
}
