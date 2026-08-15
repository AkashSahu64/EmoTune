import { useState, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import { FiX, FiSend, FiSearch, FiMessageCircle, FiStar, FiClock } from 'react-icons/fi';
import api from '../../services/api';
import { Modal, ModalHeader, SearchInput, Avatar, EmptyState, LoadingSpinner, ScrollArea, Badge, Divider } from '../ui';

function ForwardModal({ message, onForward, onClose }) {
  const [chats, setChats] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get('/chats')
      .then(({ data }) => setChats(data.chats || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = chats.filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.otherUser?.username?.toLowerCase().includes(search.toLowerCase())
  );

  const recent = filtered.slice(0, 3);
  const rest = filtered.slice(3);

  return (
    <Modal isOpen onClose={onClose} size="md">
      <ModalHeader title="Forward Message" subtitle="Choose where to send this message" onClose={onClose} />

      <div className="px-4 py-2">
        <div className="bg-surface backdrop-blur-glass border border-border rounded-xl p-2.5 flex items-center gap-2.5 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg">
            {message.type === 'text' ? '💬' : message.type === 'emoji' ? '😊' : message.type === 'image' ? '🖼️' : message.type === 'song' ? '🎵' : '📎'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-text-primary truncate">Forwarding message</p>
            <p className="text-[10px] text-text-secondary truncate">{message.content || message.metadata?.emoji || '(media)'}</p>
          </div>
        </div>
      </div>

      <div className="px-4 pb-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search chats..." />
      </div>

      <ScrollArea className="max-h-72 px-2 pb-3">
        {loading ? (
          <div className="text-center py-8 text-sm text-text-secondary" role="status">Loading chats...</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="chat" title="No chats found" description="Start a new conversation first" />
        ) : (
          <div className="space-y-0.5">
            {search === '' && (
              <>
                <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider px-3 py-1.5">Recent Chats</p>
                {recent.map((chat) => (
                  <ForwardChatItem key={chat._id} chat={chat} message={message} onForward={onForward} selected={selected} setSelected={setSelected} />
                ))}
                <Divider className="my-2" />
              </>
            )}
            {(search ? filtered : rest).map((chat) => (
              <ForwardChatItem key={chat._id} chat={chat} message={message} onForward={onForward} selected={selected} setSelected={setSelected} />
            ))}
          </div>
        )}
      </ScrollArea>
    </Modal>
  );
}

function ForwardChatItem({ chat, message, onForward, selected, setSelected }) {
  const isSelected = selected === chat._id;
  return (
    <motion.button
      onClick={() => { setSelected(chat._id); onForward(message, chat._id); }}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-focus ${
        isSelected ? 'bg-primary/10' : 'hover:bg-hover/[0.07]'
      }`}
      type="button"
    >
      <Avatar
        src={chat.otherUser?.avatar || chat.avatar}
        name={chat.name || chat.otherUser?.username || '?'}
        size="md"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{chat.name || chat.otherUser?.username || 'Unknown'}</p>
        <p className="text-xs text-text-secondary">{chat.type === 'group' ? 'Group' : 'Direct Message'}</p>
      </div>
      <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
        <FiSend size={14} className="text-primary" />
      </div>
    </motion.button>
  );
}

export default memo(ForwardModal);
