export default function Divider({ label, className = '' }) {
  if (label) {
    return (
      <div className={`flex items-center gap-3 py-2 ${className}`}>
        <div className="flex-1 h-px bg-[var(--theme-border)]" />
        <span className="text-[10px] font-medium text-text-secondary uppercase tracking-wider">{label}</span>
        <div className="flex-1 h-px bg-[var(--theme-border)]" />
      </div>
    );
  }
  return <div className={`h-px bg-[var(--theme-border)] ${className}`} />;
}
