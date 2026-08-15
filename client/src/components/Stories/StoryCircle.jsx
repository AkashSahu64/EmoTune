import { memo } from 'react';

const typeBadges = {
  memory: '\u{1F570}\u{FE0F}', music: '\u{1F3B5}', voice: '\u{1F3A4}',
  ai_generated: '\u{2728}', multi_image: '\u{1F4F8}',
};

function StoryCircle({ src, name, viewed, isOwn, hasStory, onClick, type, size = 'md' }) {
  const sizeClasses = size === 'sm' ? 'size-12 text-meta' : 'size-14 text-lg';
  const containerWidth = size === 'sm' ? 'w-[60px]' : 'w-[72px]';
  return (
    <button onClick={onClick} className={`interactive flex shrink-0 flex-col items-center gap-1 rounded-lg py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 ${containerWidth}`} type="button">
      <div className={`relative rounded-full border-[2.5px] p-[2px] ${hasStory ? viewed ? 'border-border/40' : 'border-primary' : 'border-border/25'}`}>
        <div className={`${sizeClasses} overflow-hidden rounded-full border-2 border-background`}>
          {src ? <img src={src} alt={name || 'Story'} className="size-full object-cover" /> : (
            <div className="flex size-full items-center justify-center bg-primary font-bold text-on-primary">{name?.[0]?.toUpperCase() || '?'}</div>
          )}
        </div>
        {type && typeBadges[type] && <div className="absolute -bottom-0.5 -left-0.5 flex size-4 items-center justify-center text-meta">{typeBadges[type]}</div>}
        {isOwn && (
          <div className="absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full border-2 border-background bg-primary">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-on-primary" strokeWidth="3"><path d="M12 5v14M5 12h14" /></svg>
          </div>
        )}
      </div>
      <span className={`w-full truncate text-center text-meta font-medium ${hasStory ? 'text-text-primary' : 'text-text-secondary'}`}>{isOwn ? 'Your Story' : name || 'Unknown'}</span>
    </button>
  );
}

export default memo(StoryCircle);
