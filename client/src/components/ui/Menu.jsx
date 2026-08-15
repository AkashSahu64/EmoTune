import { forwardRef } from 'react';
import { cn } from '../../theme/utilities';

const Menu = forwardRef(({ isOpen, onClose, children, className = '', align = 'right', ...props }, ref) => {
  if (!isOpen) return null;
  return (
    <>
      <button className="fixed inset-0 z-40 cursor-default" onClick={onClose} aria-label="Close menu" type="button" />
      <div
        ref={ref}
        className={cn('glass-popover absolute z-50 min-w-[180px] rounded-lg py-1', align === 'right' ? 'right-0' : 'left-0', className)}
        role="menu"
        {...props}
      >
        {children}
      </div>
    </>
  );
});

Menu.displayName = 'Menu';
export default Menu;

export function MenuItem({ icon: Icon, label, onClick, danger, disabled, shortcut, ...props }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'interactive flex w-full items-center gap-3 px-3 py-2.5 text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus/50 disabled:opacity-40',
        danger ? 'text-danger' : 'text-text-primary',
      )}
      role="menuitem"
      type="button"
      {...props}
    >
      {Icon && <Icon size={15} className="shrink-0" aria-hidden="true" />}
      <span className="flex-1 text-left">{label}</span>
      {shortcut && <kbd className="font-mono text-meta text-text-muted">{shortcut}</kbd>}
    </button>
  );
}
