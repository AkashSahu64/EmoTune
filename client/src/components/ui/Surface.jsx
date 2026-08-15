import { cn } from '../../theme/utilities';

const Surface = ({ children, className = '', ...props }) => (
  <div className={cn('glass-surface rounded-lg', className)} {...props}>{children}</div>
);

export default Surface;
