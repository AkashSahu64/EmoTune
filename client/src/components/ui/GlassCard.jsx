import { createElement, forwardRef } from 'react';
import { cn } from '../../theme/utilities';

const GlassCard = forwardRef(({ children, className = '', hover = false, onClick, as = 'div', ...props }, ref) => createElement(
  as,
  {
    ref,
    onClick,
    className: cn(
      'glass-surface rounded-xl',
      (hover || onClick) && 'interactive hover:border-border/50 dark:hover:border-border-dark/50 hover:bg-surface-elevated/70 dark:hover:bg-surface-elevated-dark/70',
      onClick && 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 dark:focus-visible:ring-focus-dark/60',
      className,
    ),
    ...props,
  },
  children,
));

GlassCard.displayName = 'GlassCard';
export default GlassCard;
