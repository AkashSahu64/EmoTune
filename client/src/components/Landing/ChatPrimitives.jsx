import { memo } from 'react';

export const Avatar = memo(({ name, color, size = 'w-8 h-8', className = '' }) => {
  const initial = name?.[0]?.toUpperCase() || '?';
  const bg = color || 'var(--theme-primary)';
  return (
    <div
      className={`rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${size} ${className}`}
      style={{ backgroundColor: bg }}
      aria-hidden="true"
    >
      {initial}
    </div>
  );
});

export const StatusDot = memo(({ online = false }) => (
  <span
    className={`w-2 h-2 rounded-full border-2 border-[var(--theme-surface)] ${online ? 'bg-success' : 'bg-[var(--theme-text-secondary)]'}`}
    aria-hidden="true"
  />
));

export const TypingDots = memo(() => (
  <span className="flex gap-0.5" aria-label="typing">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="w-1.5 h-1.5 rounded-full bg-[var(--theme-text-secondary)]"
      />
    ))}
  </span>
));

export const CheckMark = memo(({ seen = false }) => (
  <svg width="14" height="10" viewBox="0 0 14 10" fill="none" className={seen ? 'text-primary' : 'text-text-secondary'}>
    <path d="M1 5L4 8L9 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    {seen && <path d="M8 5L11 8L16 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>}
  </svg>
));

export const ChatHeader = memo(({ name, online, avatarColor }) => (
  <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-border bg-surface backdrop-blur-glass">
    <div className="relative">
      <Avatar name={name} color={avatarColor} size="w-7 h-7" />
      <StatusDot online={online} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[12px] font-semibold text-text-primary truncate">{name}</p>
      <p className="text-[9px] text-text-secondary">{online ? 'Online' : 'offline'}</p>
    </div>
    <div className="flex gap-1.5">
      <div className="w-6 h-6 rounded-full bg-surface-elevated backdrop-blur-glass border border-border flex items-center justify-center">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--theme-text-secondary)" strokeWidth="2"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
      </div>
      <div className="w-6 h-6 rounded-full bg-surface-elevated backdrop-blur-glass border border-border flex items-center justify-center">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--theme-text-secondary)" strokeWidth="2"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
      </div>
    </div>
  </div>
));

export function Bubble({ children, sent = true, time = '12:00', status, color = 'var(--theme-primary)' }) {
  return (
    <div className={`flex ${sent ? 'justify-end' : 'justify-start'} mb-1.5`}>
      <div
        className={`max-w-[80%] px-3 py-2 text-[12px] leading-relaxed ${
          sent
            ? 'rounded-2xl rounded-br-sm text-white'
            : 'rounded-2xl rounded-bl-sm text-text-primary border border-border'
        }`}
        style={sent ? { backgroundColor: color } : { backgroundColor: 'var(--theme-surface-elevated)' }}
      >
        {children}
        <div className={`flex items-center gap-0.5 mt-0.5 ${sent ? 'justify-end' : ''}`}>
          <span className="text-[9px] text-text-secondary">{time}</span>
          {status && <CheckMark seen={status === 'seen'} />}
        </div>
      </div>
    </div>
  );
}

export function BubbleReaction({ emoji, count = 1 }) {
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-surface-elevated backdrop-blur-glass border border-border text-[10px] -ml-1 -mt-2 relative z-10">
      <span>{emoji}</span>
      <span className="text-text-secondary text-[9px]">{count}</span>
    </span>
  );
}

export function DateSeparator({ date }) {
  return (
    <div className="flex items-center gap-3 my-3">
      <div className="flex-1 h-px bg-[var(--theme-border)]" />
      <span className="text-[10px] text-text-secondary flex-shrink-0">{date}</span>
      <div className="flex-1 h-px bg-[var(--theme-border)]" />
    </div>
  );
}

export function DeviceFrame({ children, type = 'phone' }) {
  const frameClass = type === 'phone'
    ? 'rounded-[28px] border-[3px] border-border max-w-[320px] mx-auto'
    : type === 'tablet'
    ? 'rounded-[20px] border-[3px] border-border'
    : 'rounded-[16px] border border-border';

  return (
    <div className={`overflow-hidden bg-surface backdrop-blur-glass shadow-floating ${frameClass}`}>
      {children}
    </div>
  );
}
