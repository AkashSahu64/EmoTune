import { cn } from '../../theme/utilities';

const variants = {
  default: 'bg-primary text-on-primary',
  success: 'bg-success text-white',
  warning: 'bg-warning text-white',
  danger: 'bg-danger text-white',
  glass: 'glass-surface text-text-primary',
  outline: 'border border-border/30 text-text-secondary',
  ai: 'bg-ai/14 text-ai border border-ai/20',
};

export default function Badge({ children, variant = 'default', className = '', ...props }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-meta font-medium', variants[variant] || variants.default, className)} {...props}>
      {children}
    </span>
  );
}
