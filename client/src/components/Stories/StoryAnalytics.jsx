import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import storyService from '../../services/storyService';

function StoryAnalytics({ storyId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const d = await storyService.getAnalytics(storyId);
        setData(d.analytics || d);
      } catch {} finally { setLoading(false); }
    })();
  }, [storyId]);

  if (loading) return (
    <motion.div initial={{ }} animate={{ }} exit={{ }}
      className="absolute bottom-0 left-0 right-0 z-20 bg-background rounded-t-2xl border-t border-border p-4" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-primary">Analytics</h3>
        <button onClick={onClose} className="text-text-secondary text-xs" type="button">✕</button>
      </div>
      <div className="space-y-3 animate-pulse">
        {[1,2,3,4].map(i => <div key={i} className="h-8 rounded-xl shimmer-bg" />)}
      </div>
    </motion.div>
  );

  if (!data) return null;

  const stats = [
    { label: 'Views', value: data.views ?? data.viewCount ?? 0, icon: '👁️' },
    { label: 'Unique Viewers', value: data.uniqueViewers ?? 0, icon: '👤' },
    { label: 'Completion Rate', value: data.completionRate ? `${(data.completionRate * 100).toFixed(0)}%` : '0%', icon: '✅' },
    { label: 'Avg Duration', value: data.avgViewDuration ? `${(data.avgViewDuration / 1000).toFixed(1)}s` : '0s', icon: '⏱️' },
    { label: 'Reactions', value: data.reactions ?? 0, icon: '❤️' },
    { label: 'Replies', value: data.replyCount ?? data.replies ?? 0, icon: '💬' },
    { label: 'Engagement', value: data.engagement ?? 0, icon: '📈' },
  ];

  return (
    <motion.div initial={{ }} animate={{ }} exit={{ }}
      className="absolute bottom-0 left-0 right-0 z-20 bg-background rounded-t-2xl border-t border-border max-h-[50%] overflow-y-auto scrollbar-glass p-4"
      onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-primary">📊 Story Analytics</h3>
        <button onClick={onClose} className="w-6 h-6 rounded-full hover:bg-hover/[0.07] flex items-center justify-center text-text-secondary" type="button">✕</button>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {stats.map(s => (
          <div key={s.label} className="bg-surface backdrop-blur-glass rounded-xl p-3 border border-border">
            <div className="flex items-center gap-1.5 mb-1">
              <span>{s.icon}</span>
              <span className="text-[9px] text-text-secondary font-medium uppercase tracking-wider">{s.label}</span>
            </div>
            <p className="text-lg font-bold text-text-primary">{s.value}</p>
          </div>
        ))}
      </div>

      {data.reactionDistribution && Object.keys(data.reactionDistribution).length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-2">Reactions</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(data.reactionDistribution).sort((a,b) => b[1]-a[1]).map(([emoji, count]) => (
              <span key={emoji} className="text-xs flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--theme-glass)]">
                {emoji} <span className="text-[9px] text-text-secondary">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {data.viewsOverTime?.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-2">Views Over Time</p>
          <div className="flex items-end gap-1 h-16">
            {data.viewsOverTime.slice(0, 12).map((v, i) => {
              const max = Math.max(...data.viewsOverTime.map(x => x.count || x), 1);
              const h = ((v.count || v) / max) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <div className="w-full rounded-t bg-primary transition-colors" style={{ height: `${Math.max(h, 5)}%` }} />
                  <span className="text-[6px] text-text-secondary">{v.hour || v.label || i}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {data.peakHour && (
        <p className="text-[10px] text-text-secondary">Peak hour: <span className="text-text-primary font-medium">{data.peakHour}:00</span></p>
      )}
    </motion.div>
  );
}

export default StoryAnalytics;
