import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import storyService from '../../services/storyService';
import StoryAnalytics from './StoryAnalytics';
import HighlightAddModal from './HighlightAddModal';

const STORY_DURATION = 5000;
const QUICK_EMOJIS = ['❤️', '😍', '😂', '😢', '🔥', '💯', '😮', '🥺', '👏', '🎉'];

const typeLabels = {
  text: '📝 Text', image: '📷 Photo', video: '🎬 Video', voice: '🎤 Voice',
  music: '🎵 Music', ai_generated: '✨ AI', multi_image: '📸 Multi', memory: '🕰️ Memory',
};

function StoryViewer({ stories, initialIndex, onClose, user }) {
  const [currentUserIndex, setCurrentUserIndex] = useState(initialIndex || 0);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reactEmoji, setReactEmoji] = useState(null);
  const [showViewers, setShowViewers] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showHighlightModal, setShowHighlightModal] = useState(false);
  const [existingReactions, setExistingReactions] = useState({});
  const [showMenu, setShowMenu] = useState(false);
  const progressRef = useRef(null);
  const timerRef = useRef(null);
  const viewDurationRef = useRef(0);
  const viewStartRef = useRef(Date.now());
  const segmentDuration = STORY_DURATION;

  const userGroup = stories[currentUserIndex];
  const currentStory = userGroup?.stories[currentStoryIndex];
  const isOwn = userGroup?.isOwn;
  const userInfo = userGroup?.userInfo || {};

  const content = currentStory?.content || {};

  useEffect(() => {
    viewStartRef.current = Date.now();
    viewDurationRef.current = 0;
  }, [currentUserIndex, currentStoryIndex]);

  const markViewed = useCallback(async () => {
    if (!currentStory?._id || isOwn) return;
    const elapsed = Date.now() - viewStartRef.current;
    try {
      await storyService.viewStory(currentStory._id, {
        completed: progress >= 0.9,
        duration: Math.round(elapsed),
      });
    } catch {}
  }, [currentStory, isOwn, progress]);

  useEffect(() => {
    if (currentStory) markViewed();
  }, [currentStory, markViewed]);

  const goNext = useCallback(() => {
    if (progress >= 0.1) markViewed();
    const group = stories[currentUserIndex];
    if (currentStoryIndex < group.stories.length - 1) {
      setCurrentStoryIndex(i => i + 1);
      setProgress(0);
      viewStartRef.current = Date.now();
    } else if (currentUserIndex < stories.length - 1) {
      setCurrentUserIndex(i => i + 1);
      setCurrentStoryIndex(0);
      setProgress(0);
      viewStartRef.current = Date.now();
    } else {
      onClose();
    }
  }, [stories, currentUserIndex, currentStoryIndex, onClose, progress, markViewed]);

  const goPrev = useCallback(() => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(i => i - 1);
      setProgress(0);
      viewStartRef.current = Date.now();
    } else if (currentUserIndex > 0) {
      setCurrentUserIndex(i => i - 1);
      const prevLen = stories[currentUserIndex - 1]?.stories.length || 1;
      setCurrentStoryIndex(prevLen - 1);
      setProgress(0);
      viewStartRef.current = Date.now();
    }
  }, [stories, currentUserIndex, currentStoryIndex]);

  useEffect(() => {
    if (paused || !currentStory) return;
    const startTime = Date.now();
    viewStartRef.current = startTime;
    setProgress(0);

    const update = () => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(elapsed / segmentDuration, 1);
      setProgress(pct);
      if (pct >= 1) {
        goNext();
      }
    };
    timerRef.current = setInterval(update, 50);
    return () => clearInterval(timerRef.current);
  }, [currentUserIndex, currentStoryIndex, paused, currentStory, goNext]);

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width * 0.3) {
      goPrev();
    } else if (x > rect.width * 0.7) {
      goNext();
    } else {
      setPaused(p => !p);
    }
  };

  const handleReact = async (emoji) => {
    setReactEmoji(emoji);
    setTimeout(() => setReactEmoji(null), 1500);
    setExistingReactions(prev => {
      const arr = [...(prev[currentStory?._id] || [])];
      const idx = arr.indexOf(emoji);
      if (idx >= 0) arr.splice(idx, 1);
      else arr.push(emoji);
      return { ...prev, [currentStory?._id]: arr };
    });
    if (currentStory?._id) {
      try { await storyService.reactToStory(currentStory._id, emoji); } catch {}
    }
  };

  const handleDelete = async () => {
    if (!currentStory?._id || !isOwn) return;
    try {
      await storyService.deleteStory(currentStory._id);
      toast.success('Story deleted');
      goNext();
    } catch { toast.error('Failed to delete'); }
    setShowMenu(false);
  };

  const handleReply = async (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      try {
        await storyService.replyToStory(currentStory._id, e.target.value);
        e.target.value = '';
        toast.success('Reply sent');
      } catch { toast.error('Failed to send reply'); }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowRight') goNext();
    if (e.key === 'ArrowLeft') goPrev();
    if (e.key === ' ') { e.preventDefault(); setPaused(p => !p); }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const reactions = useMemo(() => {
    const list = currentStory?.metadata?.reactions || [];
    const counts = {};
    for (const r of list) {
      const e = r.emoji || r;
      counts[e] = (counts[e] || 0) + 1;
    }
    return counts;
  }, [currentStory?.metadata?.reactions]);

  const viewers = useMemo(() => {
    return (currentStory?.metadata?.viewDetails || []).map(v => ({
      user: v.user,
      viewedAt: v.viewedAt,
      completed: v.completed,
    }));
  }, [currentStory?.metadata?.viewDetails]);

  if (!currentStory) return null;

  const bgColor = content.backgroundColor || '#1a1a2e';
  const hasMedia = content.mediaUrl || content.gifUrl;
  const timeAgo = currentStory.createdAt
    ? Math.floor((Date.now() - new Date(currentStory.createdAt).getTime()) / 60000)
    : 0;
  const timeStr = timeAgo < 1 ? 'Just now'
    : timeAgo < 60 ? `${timeAgo}m ago`
    : timeAgo < 1440 ? `${Math.floor(timeAgo / 60)}h ago`
    : new Date(currentStory.createdAt).toLocaleDateString();

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
      initial={{ }}
      animate={{ }}
      exit={{ }}
      onClick={handleClick}
      onMouseDown={() => setPaused(true)}
      onMouseUp={() => setPaused(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Story viewer"
    >
      <div className="relative w-full max-w-[420px] h-full max-h-[750px] mx-auto flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="absolute top-0 left-0 right-0 z-10 p-2 flex gap-1.5">
          {userGroup?.stories.map((s, i) => (
            <div key={s._id || i} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
              <div className="h-full bg-white rounded-full transition-colors duration-100" style={{
                width: i < currentStoryIndex ? '100%' : i === currentStoryIndex ? `${progress * 100}%` : '0%',
              }} />
            </div>
          ))}
        </div>

        <div className="absolute top-3 left-3 right-3 z-10 flex items-center gap-2">
          <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/30 flex-shrink-0">
            {userInfo?.avatar ? (
              <img src={userInfo.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-ai flex items-center justify-center text-white text-xs font-bold">
                {userInfo?.username?.[0]?.toUpperCase() || '?'}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-white text-xs font-semibold truncate">{userInfo?.username || 'Unknown'}</p>
              {currentStory.type && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/70">{typeLabels[currentStory.type] || currentStory.type}</span>
              )}
              {currentStory.aiGenerated?.caption && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-ai text-purple-200">✨ AI</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/50 text-[10px]">{timeStr}</span>
              {content.location?.name && <span className="text-white/50 text-[10px]">📍 {content.location.name}</span>}
              {currentStory.expiresAt && (
                <span className="text-white/40 text-[9px]">
                  ⏳ {Math.max(0, Math.floor((new Date(currentStory.expiresAt) - Date.now()) / 3600000))}h
                </span>
              )}
            </div>
          </div>
          <motion.button onClick={(e) => { e.stopPropagation(); setShowMenu(p => !p); }} className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white/80 hover:text-white" type="button" aria-label="Menu">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
          </motion.button>
          <motion.button onClick={(e) => { e.stopPropagation(); onClose(); }} className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white/80 hover:text-white" type="button" aria-label="Close story">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </motion.button>
        </div>

        <AnimatePresence>
          {showMenu && (
            <motion.div initial={{ }} animate={{ }} exit={{ }} className="absolute top-14 right-3 z-20 bg-background rounded-xl shadow-floating border border-border overflow-hidden min-w-[140px]">
              {isOwn && (
                <button onClick={(e) => { e.stopPropagation(); handleDelete(); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors" type="button">
                  🗑️ Delete Story
                </button>
              )}
              {isOwn && viewers.length > 0 && (
                <button onClick={(e) => { e.stopPropagation(); setShowViewers(true); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-text-secondary hover:bg-hover/[0.07] transition-colors" type="button">
                  👁️ Viewers ({viewers.length})
                </button>
              )}
              {isOwn && (
                <button onClick={(e) => { e.stopPropagation(); setShowAnalytics(true); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-text-secondary hover:bg-hover/[0.07] transition-colors" type="button">
                  📊 Analytics
                </button>
              )}
              {isOwn && (
                <button onClick={(e) => { e.stopPropagation(); setShowHighlightModal(true); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-text-secondary hover:bg-hover/[0.07] transition-colors" type="button">
                  ⭐ Add to Highlights
                </button>
              )}
              {currentStory.tags?.length > 0 && (
                <div className="px-3 py-2 border-t border-border">
                  <p className="text-[9px] text-text-secondary mb-1">Tags</p>
                  <div className="flex flex-wrap gap-1">{currentStory.tags.map(t => <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/60">#{t}</span>)}</div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 flex items-center justify-center relative overflow-hidden">
          {hasMedia ? (
            content.mediaType?.startsWith('video/') ? (
              <video src={content.mediaUrl} className="w-full h-full object-contain" autoPlay playsInline
                onPlay={() => setPaused(false)} onPause={() => setPaused(true)} onEnded={goNext} />
            ) : (
              <img src={content.mediaUrl || content.gifUrl} alt="" className="w-full h-full object-contain" style={content.filterName ? { filter: 'brightness(1.05) contrast(1.1)' } : {}} />
            )
          ) : content.text ? (
            <div className="w-full h-full flex items-center justify-center p-8" style={{ backgroundColor: bgColor }}>
              <p className="text-white text-center whitespace-pre-wrap break-words leading-relaxed"
                style={{ fontSize: content.fontSize || '24px', fontFamily: content.fontFamily || 'inherit' }}>
                {content.text}
              </p>
            </div>
          ) : content.musicUrl ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-8" style={{ backgroundColor: bgColor }}>
              <div className="w-20 h-20 rounded-full bg-ai flex items-center justify-center animate-spin" style={{ animationDuration: '3s' }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="white"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
              </div>
              <p className="text-white text-lg font-semibold">{content.musicTitle || 'Music'}</p>
              {content.musicUrl && <audio src={content.musicUrl} controls className="w-full max-w-[250px] opacity-70" autoPlay />}
            </div>
          ) : content.voiceUrl ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-8" style={{ backgroundColor: bgColor }}>
              <div className="w-20 h-20 rounded-full bg-success flex items-center justify-center">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="white"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
              </div>
              <p className="text-white/60 text-sm">Voice Note {content.voiceDuration ? `(${content.voiceDuration}s)` : ''}</p>
              {content.voiceUrl && <audio src={content.voiceUrl} controls className="w-full max-w-[250px] opacity-70" autoPlay />}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: bgColor }}>
              <p className="text-white/50 text-sm">No content</p>
            </div>
          )}

          {content.stickers?.map((st, i) => (
            <div key={i} className="absolute pointer-events-none" style={{ left: `${st.position?.x || 50}%`, top: `${st.position?.y || 50}%`, transform: `translate(-50%,-50%) rotate(${st.rotation || 0}deg)`, width: `${st.size || 60}px`, height: `${st.size || 60}px` }}>
              <img src={st.url} alt="" className="w-full h-full object-contain" />
            </div>
          ))}
          {content.emojis?.map((em, i) => (
            <span key={i} className="absolute pointer-events-none" style={{ left: `${em.position?.x || 50}%`, top: `${em.position?.y || 50}%`, transform: 'translate(-50%,-50%)', fontSize: `${em.size || 32}px` }}>{em.emoji}</span>
          ))}
        </div>

        <div className="absolute bottom-20 left-4 right-4 z-10">
          {content.caption && (
            <p className="text-white/70 text-xs text-center mb-2 line-clamp-2">{content.caption}</p>
          )}
          {currentStory.tags?.length > 0 && (
            <div className="flex justify-center gap-1.5 mb-2">
              {currentStory.tags.slice(0, 3).map(t => (
                <span key={t} className="text-[9px] px-2 py-0.5 rounded-full bg-white/10 text-white/60">#{t}</span>
              ))}
            </div>
          )}
        </div>

        <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 flex-1 overflow-x-auto scrollbar-hide">
              {QUICK_EMOJIS.map(emoji => (
                <motion.button key={emoji}
                  onClick={(e) => { e.stopPropagation(); handleReact(emoji); }}
                  className={`flex-shrink-0 rounded-full text-lg transition-colors ${reactEmoji === emoji ? 'bg-selection/20 ring-2 ring-primary/40' : ''}`}
                  type="button" aria-label={`React ${emoji}`}>
                  {emoji}
                </motion.button>
              ))}
            </div>
            {isOwn && (
              <motion.button
                onClick={(e) => { e.stopPropagation(); setShowViewers(p => !p); }}
                className="text-white/50 text-[10px] flex items-center gap-1 flex-shrink-0" type="button">
                👁️ {currentStory?.metadata?.viewCount || 0}
              </motion.button>
            )}
          </div>

          {Object.keys(reactions).length > 0 && (
            <div className="flex items-center gap-1.5">
              {Object.entries(reactions).sort((a,b) => b[1]-a[1]).slice(0,5).map(([emoji, count]) => (
                <span key={emoji} className="text-sm flex items-center gap-0.5 bg-white/10 rounded-full px-2 py-0.5">
                  {emoji} <span className="text-[9px] text-white/60">{count}</span>
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input placeholder="Send message..." className="flex-1 bg-white/10 border border-white/20 rounded-full px-4 py-2 text-white text-xs placeholder-white/40 focus:outline-none focus:border-white/40" onKeyDown={handleReply} />
          </div>
        </div>

        <AnimatePresence>
          {reactEmoji && (
            <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl pointer-events-none z-20"
              initial={{ }} animate={{ }} exit={{ }} key={reactEmoji}>
              {reactEmoji}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showAnalytics && isOwn && (
            <StoryAnalytics storyId={currentStory._id} onClose={() => setShowAnalytics(false)} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showHighlightModal && isOwn && (
            <HighlightAddModal storyId={currentStory._id} onClose={() => setShowHighlightModal(false)} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showViewers && isOwn && (
            <motion.div initial={{ }} animate={{ }} exit={{ }}
              className="absolute bottom-0 left-0 right-0 z-20 bg-background rounded-t-2xl border-t border-border max-h-[40%] overflow-y-auto p-4"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-text-primary">Viewers ({viewers.length})</h3>
                <button onClick={() => setShowViewers(false)} className="text-text-secondary" type="button">✕</button>
              </div>
              <div className="space-y-2">
                {viewers.map((v, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-text-secondary">
                    <span className="w-6 h-6 rounded-full bg-ai flex items-center justify-center text-white text-[8px] font-bold">
                      {v.user?.toString().slice(-2) || '?'}
                    </span>
                    <span>{v.user?.toString().slice(-6) || 'Unknown'}</span>
                    <span className="ml-auto">{v.completed ? '✅' : '🔄'} {Math.round(v.duration / 1000)}s</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default StoryViewer;
