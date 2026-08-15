import { useState, useEffect, useRef, memo } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { FiX, FiSearch, FiMessageCircle, FiUser, FiClock, FiStar } from 'react-icons/fi';
import api from '../../services/api';
import { useSocket } from '../../hooks/useSocket';
import { Modal, ModalHeader, SearchInput, Avatar, StatusDot, EmptyState, LoadingSpinner, ScrollArea, Divider } from '../ui';

function NewChatModal({ onClose, onSelectChat }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(null);
  const { onlineUsers } = useSocket();
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
        setResults(data.users || []);
      } catch { setResults([]); } finally { setSearching(false); }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const handleSelect = async (userId) => {
    if (creating) return;
    setCreating(userId);
    try {
      const { data } = await api.post(`/chats/direct/${userId}`);
      onSelectChat(data.chat);
      toast.success('Chat opened');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create chat'); } finally { setCreating(null); }
  };

  const recentContacts = results.length === 0 && !query ? [
    { _id: '1', username: 'AI Assistant', avatar: '', isOnline: true, isAI: true },
  ] : [];

  return (
    <Modal isOpen onClose={onClose} size="lg">
      <ModalHeader title="New Chat" subtitle="Search for users to start a conversation" onClose={onClose} />

      <div className="p-4" role="search" aria-label="Search users">
        <SearchInput
          ref={inputRef}
          value={query}
          onChange={setQuery}
          placeholder="Search users by name or email..."
          className="w-full"
        />
      </div>

      <ScrollArea className="max-h-80 px-2 pb-3">
        {searching && (
          <div className="flex items-center justify-center py-12" role="status">
            <LoadingSpinner size="md" />
          </div>
        )}

        {!searching && query && results.length === 0 && (
          <EmptyState icon="search" title="No users found" description="Try a different search term" />
        )}

        {!searching && results.map((u) => (
          <motion.button
            key={u._id}
            onClick={() => handleSelect(u._id)}
            disabled={creating === u._id}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-hover/[0.07] transition-colors text-left disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-focus"
            role="option"
            type="button"
          >
            <Avatar src={u.avatar} name={u.username} size="md" status={onlineUsers?.has?.(u._id) ? 'online' : 'offline'} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{u.username}</p>
              <p className="text-xs text-text-secondary truncate">{u.email}</p>
            </div>
            <div className="flex-shrink-0">
              {creating === u._id ? (
                <LoadingSpinner size="sm" />
              ) : (
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FiMessageCircle className="text-primary" size={16} />
                </div>
              )}
            </div>
          </motion.button>
        ))}

        {!query && !searching && (
          <div className="space-y-1 px-1">
            <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider px-2 py-2">Recent Contacts</p>
            {recentContacts.map((u) => (
              <motion.button
                key={u._id}
                onClick={() => u.isAI ? toast.info('AI Assistant coming soon!') : handleSelect(u._id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-hover/[0.07] transition-colors text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-focus"
                type="button"
              >
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold">AI</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{u.username}</p>
                  <p className="text-xs text-text-secondary">AI-powered assistant</p>
                </div>
                <FiStar size={16} className="text-warning" />
              </motion.button>
            ))}
            <p className="text-xs text-text-secondary text-center py-6">Type a name or email to search</p>
          </div>
        )}
      </ScrollArea>
    </Modal>
  );
}

export default memo(NewChatModal);
