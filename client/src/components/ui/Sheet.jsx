import { useEffect } from 'react';
import { cn } from '../../theme/utilities';

const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl', full: 'max-w-full' };

export default function Sheet({ isOpen, onClose, children, side = 'right', size = 'md' }) {
  useEffect(() => {
    const handleEscape = (event) => { if (event.key === 'Escape') onClose?.(); };
    if (!isOpen) return undefined;
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const placement = side === 'right' ? 'right-0 h-full' : side === 'left' ? 'left-0 h-full' : side === 'bottom' ? 'bottom-0 w-full' : 'top-0 w-full';

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
      <button className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-sm" onClick={onClose} aria-label="Close panel" type="button" />
      <div className={cn('glass-dialog absolute overflow-hidden', placement, sizes[size] || sizes.md)}>{children}</div>
    </div>
  );
}
