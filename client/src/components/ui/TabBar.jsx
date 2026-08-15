import { cn } from '../../theme/utilities';

export default function TabBar({ tabs, activeTab, onChange, className = '' }) {
  return (
    <div className={cn('scrollbar-hide flex items-center gap-1 overflow-x-auto border-b border-border/20 px-3 py-2', className)} role="tablist">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'interactive relative flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-label font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50',
              isActive ? 'bg-primary text-on-primary' : 'text-text-secondary hover:text-text-primary',
            )}
            aria-selected={isActive}
            role="tab"
            type="button"
          >
            {Icon && <Icon size={14} aria-hidden="true" />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
