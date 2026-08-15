import { forwardRef } from 'react';

const ScrollArea = forwardRef(function ScrollArea({ children, className = '', ...props }, ref) {
  return (
    <div ref={ref} className={`overflow-y-auto scrollbar-glass ${className}`} {...props}>
      {children}
    </div>
  );
});

export default ScrollArea;
