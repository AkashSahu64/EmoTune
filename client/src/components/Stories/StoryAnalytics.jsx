import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import storyService from '../../services/storyService';

function StoryAnalytics({ storyId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(false);
    (async () => {
      try {
        const d = await storyService.getAnalytics(storyId);
        setData(d.analytics || d);
      } catch { setError(true); } finally { setLoading(false); }
    })();
  };

  useEffect(() => { loadAnalytics(); }, [storyId]);

  if (loading) return (
    <motion.div initial={{ }} animate={{ }} exit={{ }}
      className="absolute bottom-0 left-0 right-0 z-20 bg-background dark:bg-background-dark rounded-t-2xl border-t border-border dark:border-border-dark p-4 lg:fixed lg:bottom-4 lg:left-[calc(50%+226px)] lg:right-auto lg:w-[min(360px,calc(50vw-226px))] lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:rounded-2xl lg:border lg:shadow-floating" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">Analytics</h3>
        <button onClick={onClose} className="text-text-secondary dark:text-text-secondary-dark text-xs" type="button">✕</button>
      </div>
      <div className="space-y-3 animate-pulse">
        {[1,2,3,4].map(i => <div key={i} className="h-8 rounded-xl shimmer-bg" />)}
      </div>
    </motion.div>
  );

  if (error || !data) return (
    <motion.div initial={{ }} animate={{ }} exit={{ }} className="absolute bottom-0 left-0 right-0 z-20 rounded-t-2xl border-t border-border bg-background p-4 dark:border-border-dark dark:bg-background-dark lg:fixed lg:bottom-4 lg:left-[calc(50%+226px)] lg:right-auto lg:w-[min(360px,calc(50vw-226px))] lg:rounded-2xl lg:border lg:shadow-floating" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">Analytics unavailable</h3>
          <p className="mt-1 text-[11px] text-text-secondary dark:text-text-secondary-dark">We couldn’t load insights for this Story.</p>
        </div>
        <button onClick={loadAnalytics} className="rounded-lg bg-primary px-3 py-2 text-[11px] font-semibold text-on-primary" type="button">Retry</button>
      </div>
    </motion.div>
  );

  // The analytics API returns reactions as [{ emoji, count }], while older
  // responses may expose a numeric total or a distribution object. Normalize
  // all supported shapes before rendering so an API response can never become
  // an invalid React child.
  const rawReactions = data.reactions;
  const reactionItems = Array.isArray(rawReactions)
    ? rawReactions
    : rawReactions && typeof rawReactions === 'object' && ('emoji' in rawReactions || 'count' in rawReactions)
      ? [rawReactions]
      : Object.entries(data.reactionDistribution || {}).map(([emoji, count]) => ({ emoji, count }));
  const reactionTotal = typeof rawReactions === 'number'
    ? rawReactions
    : reactionItems.reduce((total, item) => total + (Number(item?.count) || 0), 0);
  const reactionDistribution = reactionItems.reduce((distribution, item) => {
    const emoji = typeof item === 'string' ? item : item?.emoji;
    const count = typeof item === 'string' ? 1 : Number(item?.count) || 0;
    if (emoji) distribution[emoji] = (distribution[emoji] || 0) + count;
    return distribution;
  }, {});

  const stats = [
    { label: 'Views', value: data.views ?? data.viewCount ?? 0, icon: '👁️' },
    { label: 'Unique Viewers', value: data.uniqueViewers ?? 0, icon: '👤' },
    { label: 'Completion Rate', value: data.completionRate ? `${(data.completionRate * 100).toFixed(0)}%` : '0%', icon: '✅' },
    { label: 'Avg Duration', value: data.avgViewDuration ? `${(data.avgViewDuration / 1000).toFixed(1)}s` : '0s', icon: '⏱️' },
    { label: 'Reactions', value: reactionTotal, icon: '❤️' },
    { label: 'Replies', value: data.replyCount ?? data.replies ?? 0, icon: '💬' },
    { label: 'Engagement', value: data.engagement ?? 0, icon: '📈' },
  ];

  return (
    <motion.div initial={{ }} animate={{ }} exit={{ }}
      className="absolute bottom-0 left-0 right-0 z-20 bg-background dark:bg-background-dark rounded-t-2xl border-t border-border dark:border-border-dark max-h-[50%] overflow-y-auto scrollbar-glass p-4 lg:fixed lg:bottom-4 lg:left-[calc(50%+226px)] lg:right-auto lg:w-[min(360px,calc(50vw-226px))] lg:max-h-[calc(100vh-2rem)] lg:rounded-2xl lg:border lg:shadow-floating"
      onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">📊 Story Analytics</h3>
        <button onClick={onClose} className="w-6 h-6 rounded-full hover:bg-hover/[0.07] dark:hover:bg-hover-dark/[0.07] flex items-center justify-center text-text-secondary dark:text-text-secondary-dark" type="button">✕</button>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {stats.map(s => (
          <div key={s.label} className="bg-surface dark:bg-surface-dark backdrop-blur-glass rounded-xl p-3 border border-border dark:border-border-dark">
            <div className="flex items-center gap-1.5 mb-1">
              <span>{s.icon}</span>
              <span className="text-[9px] text-text-secondary dark:text-text-secondary-dark font-medium uppercase tracking-wider">{s.label}</span>
            </div>
            <p className="text-lg font-bold text-text-primary dark:text-text-primary-dark">{s.value}</p>
          </div>
        ))}
      </div>

      {Object.keys(reactionDistribution).length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-semibold text-text-secondary dark:text-text-secondary-dark uppercase tracking-wider mb-2">Reactions</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(reactionDistribution).sort((a,b) => b[1]-a[1]).map(([emoji, count]) => (
              <span key={emoji} className="text-xs flex items-center gap-1 px-2 py-1 rounded-full bg-surface/80 dark:bg-surface-dark/80">
                {emoji} <span className="text-[9px] text-text-secondary dark:text-text-secondary-dark">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {data.viewsOverTime?.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-semibold text-text-secondary dark:text-text-secondary-dark uppercase tracking-wider mb-2">Views Over Time</p>
          <div className="flex items-end gap-1 h-16">
            {data.viewsOverTime.slice(0, 12).map((v, i) => {
              const max = Math.max(...data.viewsOverTime.map(x => x.count || x), 1);
              const h = ((v.count || v) / max) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <div className="w-full rounded-t bg-primary dark:bg-primary-dark transition-colors" style={{ height: `${Math.max(h, 5)}%` }} />
                  <span className="text-[6px] text-text-secondary dark:text-text-secondary-dark">{v.hour || v.label || i}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(data.peakHour ?? data.audienceDemographic?.peakHour) !== null && (data.peakHour ?? data.audienceDemographic?.peakHour) !== undefined && (
        <p className="text-[10px] text-text-secondary dark:text-text-secondary-dark">Peak hour: <span className="text-text-primary dark:text-text-primary-dark font-medium">{data.peakHour ?? data.audienceDemographic?.peakHour}:00</span></p>
      )}
    </motion.div>
  );
}

export default StoryAnalytics;
