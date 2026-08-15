import { cn } from '../../theme/utilities';

const Panel = ({ children, className = '', ...props }) => (
  <div className={cn('glass-surface flex h-full flex-col', className)} {...props}>{children}</div>
);

export default Panel;
