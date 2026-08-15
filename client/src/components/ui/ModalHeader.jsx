import { FiX } from 'react-icons/fi';

export default function ModalHeader({ title, subtitle, onClose, actions }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-border">
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
        {subtitle && <p className="text-xs text-text-secondary mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
        {actions}
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-hover/[0.07] text-text-secondary hover:text-text-primary transition-colors" aria-label="Close" type="button">
            <FiX size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
