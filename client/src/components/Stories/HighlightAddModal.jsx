import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import storyService from '../../services/storyService';

function HighlightAddModal({ storyId, onClose }) {
  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const d = await storyService.getHighlights();
        setHighlights(d.highlights || []);
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  const addToExisting = async (hlId) => {
    try {
      const hl = highlights.find(h => h._id === hlId);
      const existingIds = (hl?.stories || []).map(s => s._id || s.toString());
      await storyService.createHighlight(hl.name, [storyId], hlId);
      toast.success('Added to highlight!');
      onClose();
    } catch { toast.error('Failed to add to highlight'); }
  };

  const createNew = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await storyService.createHighlight(name, [storyId]);
      toast.success('Highlight created!');
      onClose();
    } catch { toast.error('Failed to create highlight'); } finally { setCreating(false); }
  };

  return (
    <motion.div initial={{ }} animate={{ }} exit={{ }}
      className="absolute bottom-0 left-0 right-0 z-20 bg-background dark:bg-background-dark rounded-t-2xl border-t border-border dark:border-border-dark p-4 lg:fixed lg:bottom-4 lg:left-[calc(50%+226px)] lg:right-auto lg:w-[min(360px,calc(50vw-226px))] lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:rounded-2xl lg:border lg:shadow-floating"
      onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">⭐ Add to Highlights</h3>
        <button onClick={onClose} className="w-6 h-6 rounded-full hover:bg-hover/[0.07] dark:hover:bg-hover-dark/[0.07] flex items-center justify-center text-text-secondary dark:text-text-secondary-dark" type="button">✕</button>
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">{[1,2].map(i => <div key={i} className="h-10 rounded-xl shimmer-bg" />)}</div>
      ) : (
        <>
          {highlights.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] text-text-secondary dark:text-text-secondary-dark font-medium uppercase tracking-wider mb-2">Existing Highlights</p>
              <div className="flex flex-wrap gap-2">
                {highlights.map(hl => (
                  <motion.button key={hl._id}
                    onClick={() => addToExisting(hl._id)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface dark:bg-surface-dark backdrop-blur-glass hover:bg-hover/[0.07] dark:hover:bg-hover-dark/[0.07] border border-border dark:border-border-dark text-xs text-text-primary dark:text-text-primary-dark" type="button">
                    <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold" style={{ background: hl.color || '#3B5BFF', color: '#fff' }}>{hl.name?.[0] || '?'}</span>
                    {hl.name}
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-[10px] text-text-secondary dark:text-text-secondary-dark font-medium uppercase tracking-wider mb-2">Or Create New</p>
            <div className="flex gap-2">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Highlight name..." className="flex-1 px-3 py-2 rounded-xl bg-surface/80 dark:bg-surface-dark/80 border border-border dark:border-border-dark text-xs text-text-primary dark:text-text-primary-dark placeholder:text-placeholder dark:placeholder:text-placeholder-dark focus:outline-none focus:border-primary dark:focus:border-primary-dark" onKeyDown={e => e.key === 'Enter' && createNew()} />
              <motion.button onClick={createNew} disabled={!name.trim() || creating}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-primary dark:bg-primary-dark text-white disabled:opacity-50" type="button">
                {creating ? '...' : 'Create'}
              </motion.button>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}

export default HighlightAddModal;
