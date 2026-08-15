import { cn } from '../../theme/utilities';

const sizes = {
  xs: 'size-6 text-[8px]',
  sm: 'size-8 text-label',
  md: 'size-10 text-body',
  lg: 'size-14 text-lg',
  xl: 'size-20 text-2xl',
};

const ringColors = {
  primary: 'ring-primary',
  success: 'ring-success',
  warning: 'ring-warning',
  none: 'ring-transparent',
};

const statusColors = {
  online: 'bg-online',
  away: 'bg-warning',
  busy: 'bg-danger',
  offline: 'bg-offline',
};

export default function Avatar({ src, name, size = 'md', className = '', ring = 'none', status, onClick }) {
  const initials = name ? name.split(' ').map((part) => part[0]).join('').toUpperCase().slice(0, 2) : '?';

  return (
    <div onClick={onClick} className={cn('relative shrink-0', onClick && 'cursor-pointer')}>
      <div className={cn(
        'flex items-center justify-center overflow-hidden rounded-full bg-ai/16 font-semibold text-ai ring-2 ring-offset-1 ring-offset-background',
        sizes[size],
        ringColors[ring] || ringColors.none,
        className,
      )}>
        {src ? <img src={src} alt={name || 'Avatar'} className="size-full object-cover" /> : initials}
      </div>
      {status && (
        <span
          className={cn('absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-surface', statusColors[status] || statusColors.offline)}
          aria-label={status}
        />
      )}
    </div>
  );
}
