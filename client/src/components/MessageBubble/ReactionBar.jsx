import { forwardRef, memo } from 'react';
import { getMyReaction, normalizeReactions } from './utils/reactionHelpers';

const ReactionBar = forwardRef(function ReactionBar({ reactions = [], userId, onReact, onOpenDetails }, ref) {
  const normalized = normalizeReactions(reactions);
  if (!normalized.length) return null;
  const myReaction = getMyReaction(normalized, userId);
  return (
    <div ref={ref} className="mt-1 flex max-w-full flex-wrap gap-1 px-1" aria-label="Message reactions">
      {normalized.map((reaction) => (
        <div className={`inline-flex items-stretch overflow-hidden rounded-full border bg-surface-elevated ${reaction.emoji === myReaction ? 'border-primary/70 bg-primary/10' : 'border-border/60'}`} key={reaction.emoji}>
          <button type="button" className="inline-flex items-center gap-1 px-2 py-0.5 text-sm hover:bg-hover/[.08] focus:outline-none focus:ring-2 focus:ring-focus" onClick={() => onOpenDetails?.()} aria-label={`View ${reaction.emoji} reactions`}>
            <span>{reaction.emoji}</span>
            <span className="text-[10px] text-text-secondary">{reaction.count}</span>
          </button>
          <button type="button" className="w-6 border-l border-border/40 text-xs text-text-secondary hover:bg-hover/[.08] focus:outline-none focus:ring-2 focus:ring-focus" onClick={() => onReact?.(reaction.emoji)} aria-label={reaction.emoji === myReaction ? `Remove ${reaction.emoji} reaction` : `React with ${reaction.emoji}`}>
            {reaction.emoji === myReaction ? '✓' : '+'}
          </button>
        </div>
      ))}
    </div>
  );
});

export default memo(ReactionBar);
