export default function Tag({ children, color = 'default', className = '', ...props }) {
  const colors = {
    default: 'bg-[var(--theme-glass)] text-text-secondary',
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-danger/10 text-danger',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] rounded-md font-medium ${colors[color]} ${className}`} {...props}>
      {children}
    </span>
  );
}
