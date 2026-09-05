import { useContext } from 'react';
import { FiX } from 'react-icons/fi';
import { ModalCloseContext } from './Modal';

export default function ModalHeader({ title, subtitle, onClose, actions }) {
  const modalClose = useContext(ModalCloseContext);
  const close = modalClose || onClose;

  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-border dark:border-border-dark">
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">{title}</h2>
        {subtitle && <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
        {actions}
        {close && (
          <button onClick={close} className="p-1 rounded-lg hover:bg-hover/[0.07] dark:hover:bg-hover-dark/[0.07] text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark transition-colors" aria-label="Close" type="button">
            <FiX size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
