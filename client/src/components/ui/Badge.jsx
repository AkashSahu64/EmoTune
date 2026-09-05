import { cn } from '../../theme/utilities';

const variants = {
  default: 'bg-primary dark:bg-primary-dark text-on-primary dark:text-on-primary-dark',
  success: 'bg-success dark:bg-success-dark text-white',
  warning: 'bg-warning dark:bg-warning-dark text-white',
  danger: 'bg-danger dark:bg-danger-dark text-white',
  glass: 'glass-surface text-text-primary dark:text-text-primary-dark',
  outline: 'border border-border/30 dark:border-border-dark/30 text-text-secondary dark:text-text-secondary-dark',
  ai: 'bg-ai/14 dark:bg-ai-dark/14 text-ai dark:text-ai-dark border border-ai/20 dark:border-ai-dark/20',
};

export default function Badge({ children, variant = 'default', className = '', ...props }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-meta font-medium', variants[variant] || variants.default, className)} {...props}>
      {children}
    </span>
  );
}
