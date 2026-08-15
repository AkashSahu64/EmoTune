import { useState } from 'react';
import { cn } from '../../theme/utilities';

const positions = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

export default function Tooltip({ children, content, position = 'top', className = '' }) {
  const [isVisible, setIsVisible] = useState(false);
  return (
    <div
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && content && (
        <div className={cn('glass-popover pointer-events-none absolute z-50 whitespace-nowrap rounded-md px-2.5 py-1.5 text-meta font-medium text-text-primary', positions[position])} role="tooltip">
          {content}
        </div>
      )}
    </div>
  );
}
