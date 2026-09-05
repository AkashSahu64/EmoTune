import { forwardRef } from 'react';
import { cn } from '../../theme/utilities';

const Card = forwardRef(({ children, className = '', hover = false, onClick, ...props }, ref) => (
  <div
    ref={ref}
    onClick={onClick}
    className={cn(
      'glass-surface rounded-xl p-4',
      (hover || onClick) && 'interactive hover:border-border/50 dark:hover:border-border-dark/50 hover:bg-surface-elevated/70 dark:hover:bg-surface-elevated-dark/70',
      onClick && 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 dark:focus-visible:ring-focus-dark/60',
      className,
    )}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={onClick ? (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onClick(event);
      }
    } : undefined}
    {...props}
  >
    {children}
  </div>
));

Card.displayName = 'Card';
export default Card;
