import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FiX, FiMusic, FiBookOpen, FiSmile, FiVideo, FiSend, FiTrash2, FiChevronRight, FiSearch, FiGrid, FiList, FiStar, FiClock } from 'react-icons/fi';
import { bookmarkService } from '../../services/api';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { PanelHeader, Panel, ScrollArea, EmptyState, Skeleton, Chip, SearchInput, IconButton, GlassCard, Divider } from '../ui';
import VirtualizedList from '../ui/VirtualizedList';

const categories = [
  { id: 'all', label: 'All', icon: null },
  { id: 'favorites', label: 'Favorites', icon: FiStar },
  { id: 'recent', label: 'Recent', icon: FiClock },
  { id: 'ai', label: 'AI', icon: null },
  { id: 'shayari', label: 'Shayari', icon: FiBookOpen },
  { id: 'song', label: 'Songs', icon: FiMusic },
  { id: 'emoji', label: 'Emojis', icon: FiSmile },
  { id: 'video', label: 'Videos', icon: FiVideo },
];

export default function BookmarksPanel({ onClose }) {
  const [filterType, setFilterType] = useState('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const queryClient = useQueryClient();
  const bookmarksQuery = useQuery({
    queryKey: ['bookmarks', filterType],
    queryFn: async () => {
      const { data } = await bookmarkService.getAll({ type: filterType !== 'all' ? filterType : undefined });
      return data.bookmarks || [];
    },
  });
  const bookmarks = bookmarksQuery.data || [];
  const loading = bookmarksQuery.isLoading;

  const handleDelete = async (id) => {
    try {
      await bookmarkService.delete(id);
      queryClient.setQueryData(['bookmarks', filterType], (prev = []) => prev.filter((b) => b._id !== id));
      toast.success('Bookmark removed');
    } catch { toast.error('Failed to delete bookmark'); }
  };

  const handleSend = async (bookmark) => { toast.success('Sent to chat!'); };

  const getIcon = (type) => {
    switch (type) { case 'shayari': return '💫'; case 'song': return '🎵'; case 'emoji': return '😊'; case 'video': return '📹'; default: return '🔖'; }
  };

  const getPreview = (bookmark) => {
    if (bookmark.metadata?.emoji) return bookmark.metadata.emoji;
    if (bookmark.metadata?.shayari) return bookmark.metadata.shayari.slice(0, 80) + '...';
    if (bookmark.metadata?.songTitle) return `🎵 ${bookmark.metadata.songTitle}`;
    if (bookmark.metadata?.videoQuery) return `📹 ${bookmark.metadata.videoQuery}`;
    return bookmark.content || 'Saved item';
  };

  const filtered = bookmarks.filter((b) => search ? getPreview(b).toLowerCase().includes(search.toLowerCase()) : true);
  const gridRows = [];
  for (let i = 0; i < filtered.length; i += 2) gridRows.push(filtered.slice(i, i + 2));

  return (
    <Panel>
      <PanelHeader title="Knowledge Library" subtitle="Your saved content" onClose={onClose} actions={
        <div className="flex gap-1">
          <IconButton icon={FiGrid} size="xs" onClick={() => setViewMode('grid')} active={viewMode === 'grid'} label="Grid view" />
          <IconButton icon={FiList} size="xs" onClick={() => setViewMode('list')} active={viewMode === 'list'} label="List view" />
        </div>
      } />

      <div className="px-4 py-2">
        <SearchInput value={search} onChange={setSearch} placeholder="Search bookmarks..." />
      </div>

      <div className="flex items-center gap-1 px-3 py-2 overflow-x-auto scrollbar-hide border-b border-border">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <Chip key={cat.id} icon={Icon} active={filterType === cat.id} onClick={() => setFilterType(cat.id)} size="xs" variant="ghost">
              {cat.label}
            </Chip>
          );
        })}
      </div>

      <ScrollArea className="flex-1 p-3 space-y-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={60} />)
        ) : filtered.length === 0 ? (
          <EmptyState icon="bookmark" title="No bookmarks yet" description="Save AI suggestions for later" />
        ) : viewMode === 'grid' ? (
          <VirtualizedList items={gridRows} itemHeight={138} className="h-full" renderItem={(row) => (
            <div className="grid grid-cols-2 gap-2 px-0.5">
              {row.map((bookmark) => <GlassCard key={bookmark._id} className="p-3" hover><div className="text-2xl mb-2">{getIcon(bookmark.type)}</div><p className="text-xs text-text-primary line-clamp-2">{getPreview(bookmark)}</p><p className="text-[9px] text-text-secondary mt-1">Used {bookmark.usageCount || 0} times</p></GlassCard>)}
            </div>
          )} />
        ) : (
          <VirtualizedList items={filtered} itemHeight={70} className="h-full" renderItem={(bookmark) => (
            <GlassCard key={bookmark._id} className="p-3 flex items-center gap-3 group" hover>
              <div className="w-10 h-10 rounded-xl bg-surface backdrop-blur-glass border border-border flex items-center justify-center text-lg flex-shrink-0">{getIcon(bookmark.type)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-primary truncate">{getPreview(bookmark)}</p>
                <p className="text-[10px] text-text-secondary mt-0.5">Used {bookmark.usageCount || 0} times</p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <IconButton icon={FiSend} size="xs" onClick={() => handleSend(bookmark)} label="Send" />
                <IconButton icon={FiTrash2} size="xs" onClick={() => handleDelete(bookmark._id)} label="Delete" className="hover:text-danger!" />
              </div>
            </GlassCard>
          )} />
        )}
      </ScrollArea>
    </Panel>
  );
}
