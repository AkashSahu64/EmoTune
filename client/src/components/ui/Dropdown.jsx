import { useEffect, useRef, useState } from 'react';
import { FiChevronDown } from 'react-icons/fi';
import { cn } from '../../theme/utilities';

export default function Dropdown({ trigger, children, align = 'left', className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (event) => { if (ref.current && !ref.current.contains(event.target)) setIsOpen(false); };
    const handleKey = (event) => { if (event.key === 'Escape') setIsOpen(false); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  return (
    <div ref={ref} className={cn('relative inline-block', className)}>
      <div onClick={() => setIsOpen((open) => !open)}>
        {trigger || (
          <button className="interactive flex items-center gap-1 rounded-md px-2 py-1 text-body text-text-secondary hover:text-text-primary" type="button" aria-expanded={isOpen}>
            Options <FiChevronDown size={14} />
          </button>
        )}
      </div>
      {isOpen && (
        <div className={cn('glass-popover absolute z-50 mt-1 min-w-[180px] rounded-lg py-1', align === 'right' ? 'right-0' : 'left-0')} role="menu">
          {children}
        </div>
      )}
    </div>
  );
}
