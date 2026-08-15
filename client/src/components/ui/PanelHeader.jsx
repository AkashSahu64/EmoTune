import { FiX, FiArrowLeft } from 'react-icons/fi';

export default function PanelHeader({ title, subtitle, onClose, onBack, actions, className = '' }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0 ${className}`}>
      {onBack && (
        <button onClick={onBack} className="p-1 rounded-lg hover:bg-hover/[0.07] text-text-secondary hover:text-text-primary transition-colors" aria-label="Go back" type="button">
          <FiArrowLeft size={18} />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-text-primary truncate">{title}</h3>
        {subtitle && <p className="text-[10px] text-text-secondary truncate">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {actions}
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-hover/[0.07] text-text-secondary hover:text-text-primary transition-colors" aria-label="Close panel" type="button">
            <FiX size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
