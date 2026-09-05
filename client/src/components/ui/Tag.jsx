export default function Tag({ children, color = 'default', className = '', ...props }) {
  const colors = {
    default: 'bg-surface/80 dark:bg-surface-dark/80 text-text-secondary dark:text-text-secondary-dark',
    primary: 'bg-primary/10 dark:bg-primary-dark/10 text-primary dark:text-primary-dark',
    success: 'bg-success/10 dark:bg-success-dark/10 text-success dark:text-success-dark',
    warning: 'bg-warning/10 dark:bg-warning-dark/10 text-warning dark:text-warning-dark',
    danger: 'bg-danger/10 dark:bg-danger-dark/10 text-danger dark:text-danger-dark',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] rounded-md font-medium ${colors[color]} ${className}`} {...props}>
      {children}
    </span>
  );
}
