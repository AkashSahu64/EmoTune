import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import VirtualizedList from '../ui/VirtualizedList';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import storyService from '../../services/storyService';
import StoryCircle from './StoryCircle';
import StoryViewer from './StoryViewer';
import StoryUploadModal from './StoryUploadModal';

function StoryFeed({ user, chats, socket }) {
  const [viewerData, setViewerData] = useState(null);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [showUpload, setShowUpload] = useState(false);
  const [showTrendingModal, setShowTrendingModal] = useState(false);
  const [generatingMemory, setGeneratingMemory] = useState(false);
  const queryClient = useQueryClient();
  const feedQuery = useQuery({
    queryKey: ['stories', 'feed'],
    queryFn: async () => (await storyService.getFeed()).feed,
  });
  const highlightsQuery = useQuery({
    queryKey: ['stories', 'highlights'],
    queryFn: async () => (await storyService.getHighlights()).highlights || [],
  });
  const trendingQuery = useQuery({
    queryKey: ['stories', 'trending'],
    queryFn: async () => (await storyService.getTrending(15)).stories || [],
  });

  const feed = feedQuery.data || null;
  const loading = feedQuery.isLoading;
  const highlights = highlightsQuery.data || [];
  const trendingStories = trendingQuery.data || [];

  const userMap = useMemo(() => {
    const map = {};
    if (user) map[user._id] = { username: user.username, avatar: user.avatar };
    if (chats) {
      for (const chat of chats) {
        for (const p of chat.participants || []) {
          const u = p.user || p;
          if (u?._id && !map[u._id]) map[u._id] = { username: u.username, avatar: u.avatar };
        }
      }
    }
    return map;
  }, [user, chats]);

  const fetchFeed = useCallback(() => queryClient.invalidateQueries({ queryKey: ['stories'] }), [queryClient]);

  useEffect(() => {
    if (!socket) return;
    const handler = () => fetchFeed();
    socket.on('story:new', handler);
    socket.on('story:deleted', handler);
    return () => { socket.off('story:new', handler); socket.off('story:deleted', handler); };
  }, [socket, fetchFeed]);

  const handleStoryCreated = useCallback(() => { fetchFeed(); }, [fetchFeed]);

  const handleCircleClick = useCallback((group, index) => {
    setViewerData(group);
    setViewerIndex(index);
  }, []);

  const friendGroups = useMemo(() => {
    if (!feed?.friendStories) return [];
    return feed.friendStories.map(fs => ({
      user: fs.user,
      userInfo: userMap[fs.user] || {},
      stories: fs.stories,
      hasUnviewed: fs.hasUnviewed,
      isOwn: false,
    }));
  }, [feed?.friendStories, userMap]);

  const myGroup = useMemo(() => {
    if (!feed?.myStories?.length) return [];
    return [{
      user: user?._id,
      userInfo: { username: user?.username, avatar: user?.avatar },
      stories: feed.myStories,
      isOwn: true,
    }];
  }, [feed?.myStories, user]);

  const viewerGroups = useMemo(() => [...myGroup, ...friendGroups], [myGroup, friendGroups]);

  const memoryStories = useMemo(() => {
    if (!feed?.memoryStories?.length) return [];
    return feed.memoryStories.map(s => ({
      ...s,
      userInfo: userMap[s.user] || {},
    }));
  }, [feed?.memoryStories, userMap]);

  const suggestedStories = useMemo(() => {
    if (!feed?.suggestedStories?.length) return [];
    return feed.suggestedStories.map(s => ({
      ...s,
      userInfo: userMap[s.user] || {},
    }));
  }, [feed?.suggestedStories, userMap]);

  const trendingHashtags = feed?.trending || [];

  const handleOwnStoryClick = useCallback(() => {
    if (myGroup.length > 0) {
      setViewerData(viewerGroups);
      setViewerIndex(0);
    } else {
      setShowUpload(true);
    }
  }, [myGroup, viewerGroups]);

  const handleMemoryStoryClick = useCallback(async () => {
    setGeneratingMemory(true);
    try {
      const data = await storyService.generateMemoryStory();
      if (data.story) {
        toast.success('Memory story created!');
        fetchFeed();
      } else {
        toast.error('Not enough data for a memory story');
      }
    } catch { toast.error('Failed to create memory story'); } finally { setGeneratingMemory(false); }
  }, [fetchFeed]);

  if (loading && !feed) {
    return (
      <div className="px-4 py-2 flex gap-3 overflow-x-auto scrollbar-hide">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0 w-[72px]">
            <div className="w-14 h-14 rounded-full shimmer-bg" />
            <div className="h-2.5 w-14 rounded shimmer-bg" />
          </div>
        ))}
      </div>
    );
  }

  const hasStories = feed?.myStories?.length > 0 || feed?.friendStories?.length > 0;

  return (
    <div className="border-b border-border">
      {/* Main Story Circles */}
      <div className="px-4 py-3">
        {hasStories ? (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            <StoryCircle src={user?.avatar} name={user?.username} isOwn hasStory={feed?.myStories?.length > 0} onClick={handleOwnStoryClick} />
            <VirtualizedList items={friendGroups} horizontal itemWidth={80} itemHeight={80} className="flex-1" renderItem={(group, i) => (
              <StoryCircle key={group.user} src={group.userInfo?.avatar} name={group.userInfo?.username}
                viewed={!group.hasUnviewed} hasStory={group.stories?.length > 0}
                onClick={() => { const idx = (myGroup.length > 0 ? 1 : 0) + i; handleCircleClick(viewerGroups, idx); }} />
            )} />
            <motion.button
              onClick={() => setShowUpload(true)}
              className="flex flex-col items-center gap-1.5 flex-shrink-0 w-[72px] py-1 focus:outline-none" type="button">
              <div className="w-14 h-14 rounded-full border-2 border-dashed border-border flex items-center justify-center text-text-secondary hover:border-primary hover:text-primary transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
              </div>
              <span className="text-[10px] font-medium text-text-secondary">Add</span>
            </motion.button>
          </div>
        ) : (
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <StoryCircle src={user?.avatar} name={user?.username} isOwn onClick={handleOwnStoryClick} />
            <motion.button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface backdrop-blur-glass hover:bg-hover/[0.07] border border-border transition-colors flex-shrink-0" type="button">
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
              </div>
              <span className="text-xs font-medium text-text-primary">Add Story</span>
            </motion.button>
          </div>
        )}
      </div>

      {/* Highlights */}
      {highlights.length > 0 && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">⭐ Highlights</span>
            <div className="flex-1 h-px bg-[var(--theme-border)]" />
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {highlights.map(hl => {
              const firstStory = hl.stories?.[0];
              const coverUrl = hl.coverMedia || (firstStory?.mediaUrl || firstStory?.content?.mediaUrl);
              return (
                <motion.button key={hl._id}
                  onClick={() => {
                    const hs = hl.stories || [];
                    if (hs.length > 0) {
                      const groups = [{ user: user?._id, userInfo: { username: hl.name, avatar: coverUrl }, stories: hs, isOwn: true }];
                      handleCircleClick(groups, 0);
                    }
                  }}
                  className="flex flex-col items-center gap-1 flex-shrink-0 w-[60px] focus:outline-none" type="button">
                  <div className="w-12 h-12 rounded-full bg-ai p-[2px]">
                    <div className="w-full h-full rounded-full overflow-hidden border-2 border-[var(--theme-bg)]" style={{ background: hl.color || 'var(--theme-bg)' }}>
                      {coverUrl ? <img src={coverUrl} alt="" className="w-full h-full object-cover" /> : (
                        <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold">{hl.name?.[0]?.toUpperCase() || '⭐'}</div>
                      )}
                    </div>
                  </div>
                  <span className="text-[8px] text-text-secondary truncate w-full text-center">{hl.name}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* Memory Stories */}
      {memoryStories.length > 0 && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">🕰️ Memories</span>
            <div className="flex-1 h-px bg-[var(--theme-border)]" />
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {memoryStories.map((s, i) => (
              <div key={s._id || i} className="flex flex-col items-center gap-1 flex-shrink-0 w-[60px]">
                <motion.button
                  onClick={() => {
                    const groups = [{ user: s.user, userInfo: s.userInfo, stories: [s], isOwn: false }];
                    handleCircleClick(groups, 0);
                  }}
                  className="w-12 h-12 rounded-full bg-warning p-[2px]" type="button">
                  <div className="w-full h-full rounded-full overflow-hidden border-2 border-[var(--theme-bg)]">
                    {s.userInfo?.avatar ? <img src={s.userInfo.avatar} alt="" className="w-full h-full object-cover" /> : (
                      <div className="w-full h-full bg-ai flex items-center justify-center text-white text-[8px] font-bold">🕰️</div>
                    )}
                  </div>
                </motion.button>
                <span className="text-[8px] text-text-secondary truncate w-full text-center">{s.userInfo?.username || 'Memory'}</span>
              </div>
            ))}
            <motion.button onClick={handleMemoryStoryClick} disabled={generatingMemory}
              className="flex flex-col items-center gap-1 flex-shrink-0 w-[60px] py-1 focus:outline-none" type="button">
              <div className="w-12 h-12 rounded-full border-2 border-dashed border-yellow-500/50 flex items-center justify-center text-yellow-500/70">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
              </div>
              <span className="text-[8px] text-yellow-500/70 truncate w-full text-center">{generatingMemory ? '...' : 'Create'}</span>
            </motion.button>
          </div>
        </div>
      )}

      {/* Memory Gen Button (if no memory stories) */}
      {memoryStories.length === 0 && hasStories && (
        <div className="px-4 pb-2">
          <motion.button onClick={handleMemoryStoryClick} disabled={generatingMemory}
            className="text-[10px] text-yellow-500/70 hover:text-yellow-500 flex items-center gap-1 transition-colors" type="button">
            🕰️ {generatingMemory ? 'Generating...' : 'Generate Memory Story'}
          </motion.button>
        </div>
      )}

      {/* Suggested Stories */}
      {suggestedStories.length > 0 && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">✨ Suggested</span>
            <div className="flex-1 h-px bg-[var(--theme-border)]" />
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {suggestedStories.map((s, i) => (
              <StoryCircle key={s._id || i} src={s.userInfo?.avatar} name={s.userInfo?.username}
                size="sm" hasStory onClick={() => {
                  const groups = [{ user: s.user, userInfo: s.userInfo, stories: [s], isOwn: false }];
                  handleCircleClick(groups, 0);
                }} />
            ))}
          </div>
        </div>
      )}

      {/* Trending Hashtags */}
      {trendingHashtags.length > 0 && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">🔥 Trending</span>
            <div className="flex-1 h-px bg-[var(--theme-border)]" />
          </div>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            {trendingHashtags.slice(0, 10).map((t, i) => (
              <motion.span key={t.hashtag || i}
                className="text-[10px] px-2.5 py-1 rounded-full bg-warning border border-orange-500/20 text-orange-400 whitespace-nowrap flex-shrink-0">
                {t.hashtag} <span className="text-[8px] text-orange-400/60">{t.count}</span>
              </motion.span>
            ))}
            {trendingHashtags.length > 10 && (
              <motion.button onClick={() => setShowTrendingModal(true)}
                className="text-[10px] px-2.5 py-1 rounded-full bg-surface backdrop-blur-glass border border-border text-text-secondary whitespace-nowrap flex-shrink-0" type="button">
                View all {trendingHashtags.length}
              </motion.button>
            )}
          </div>
        </div>
      )}

      {/* Trending Stories */}
      {trendingStories.length > 0 && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">🏆 Popular Stories</span>
            <div className="flex-1 h-px bg-[var(--theme-border)]" />
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {trendingStories.slice(0, 8).map((s, i) => {
              const uInfo = userMap[s.user] || {};
              return (
                <StoryCircle key={s._id || i} src={uInfo.avatar} name={uInfo.username}
                  size="sm" hasStory onClick={() => {
                    const groups = [{ user: s.user, userInfo: uInfo, stories: [s], isOwn: false }];
                    handleCircleClick(groups, 0);
                  }} />
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {viewerData && Array.isArray(viewerData) && (
          <StoryViewer stories={viewerData} initialIndex={viewerIndex} user={user}
            onClose={() => { setViewerData(null); fetchFeed(); }} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showUpload && (
          <StoryUploadModal onClose={() => setShowUpload(false)} onCreated={handleStoryCreated} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTrendingModal && (
          <TrendingModal trendingHashtags={trendingHashtags} trendingStories={trendingStories} userMap={userMap}
            onClose={() => setShowTrendingModal(false)} onViewStory={(groups, idx) => { setViewerData(groups); setViewerIndex(idx); setShowTrendingModal(false); }} />
        )}
      </AnimatePresence>
    </div>
  );
}

function TrendingModal({ trendingHashtags, trendingStories, userMap, onClose, onViewStory }) {
  const [tab, setTab] = useState('hashtags');
  return (
    <motion.div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      initial={{ }} animate={{ }} exit={{ }} onClick={onClose}>
      <motion.div className="relative w-full max-w-md mx-4 bg-background rounded-2xl overflow-hidden border border-border shadow-floating max-h-[80vh] flex flex-col"
        initial={{ }} animate={{ }} exit={{ }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-sm font-semibold text-text-primary">🔥 Trending</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-hover/[0.07] text-text-secondary" type="button">✕</button>
        </div>
        <div className="flex gap-2 px-5 py-2 border-b border-border">
          {['hashtags', 'stories'].map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${tab === t ? 'bg-primary/10 text-primary border border-primary/20' : 'text-text-secondary hover:bg-hover/[0.07]'}`} type="button">{t}</button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-glass p-4">
          {tab === 'hashtags' && trendingHashtags.map(t => (
            <div key={t.hashtag} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-hover/[0.07]">
              <span className="text-xs font-medium text-text-primary">{t.hashtag}</span>
              <span className="text-[10px] text-text-secondary">{t.count} stories</span>
            </div>
          ))}
          {tab === 'stories' && trendingStories.map(s => {
            const uInfo = userMap[s.user] || {};
            return (
              <motion.button key={s._id} onClick={() => onViewStory([{ user: s.user, userInfo: uInfo, stories: [s], isOwn: false }], 0)}
                className="w-full flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-hover/[0.07] text-left" type="button">
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-ai">
                  {uInfo.avatar ? <img src={uInfo.avatar} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white text-[8px] font-bold">?</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-text-primary truncate">{uInfo.username || 'User'}</p>
                  <p className="text-[10px] text-text-secondary truncate">{s.content?.text || s.content?.caption || 'View story'}</p>
                </div>
                <span className="text-[10px] text-text-secondary flex-shrink-0">🔥 {s.metadata?.viewCount || 0}</span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default memo(StoryFeed);
