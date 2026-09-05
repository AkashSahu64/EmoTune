export default function Divider({ label, className = '' }) {
  if (label) {
    return (
      <div className={`flex items-center gap-3 py-2 ${className}`}>
        <div className="flex-1 h-px bg-border dark:bg-border-dark" />
        <span className="text-[10px] font-medium text-text-secondary dark:text-text-secondary-dark uppercase tracking-wider">{label}</span>
        <div className="flex-1 h-px bg-border dark:bg-border-dark" />
      </div>
    );
  }
  return <div className={`h-px bg-border dark:bg-border-dark ${className}`} />;
}
