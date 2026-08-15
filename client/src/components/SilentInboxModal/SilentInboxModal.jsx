import { useState, useEffect, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import { FiX, FiCheck, FiEye, FiMessageCircle, FiBell, FiBellOff, FiClock } from 'react-icons/fi';
import { messageService } from '../../services/api';
import { Modal, ModalHeader, Button, Avatar, Badge, EmptyState, LoadingSpinner, ScrollArea, Divider, Tag } from '../ui';

function SilentInboxModal({ onClose, onAccept, totalUnread: initialUnread }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState({});

  useEffect(() => {
    messageService.getSilent()
      .then(({ data }) => {
        setGroups(data.groups || []);
        if (data.totalUnread !== undefined && onAccept) onAccept(null, data.totalUnread);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleAccept = useCallback(async (messageId, chatId) => {
    setAccepting((prev) => ({ ...prev, [messageId]: true }));
    try {
      await messageService.acceptSilent(messageId, chatId);
      setGroups((prev) => { const updated = prev.map((g) => { if (g.chatId !== chatId) return g; const remaining = g.messages.filter((m) => m.messageId !== messageId); return remaining.length > 0 ? { ...g, messages: remaining } : null; }).filter(Boolean); const newUnread = updated.reduce((s, g) => s + g.messages.filter((m) => !m.read).length, 0); onAccept?.({ messageId, chatId }, newUnread); return updated; });
    } catch { setAccepting((prev) => ({ ...prev, [messageId]: false })); }
  }, [onAccept]);

  const handleAcceptAll = useCallback(async () => {
    const promises = [];
    for (const group of groups) { for (const msg of group.messages) { promises.push(messageService.acceptSilent(msg.messageId, group.chatId).catch(() => {})); } }
    await Promise.all(promises);
    setGroups([]);
    onAccept?.({ all: true }, 0);
  }, [groups, onAccept]);

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const totalUnread = groups.reduce((s, g) => s + g.messages.filter((m) => !m.read).length, 0);

  return (
    <Modal isOpen onClose={onClose} size="lg">
      <ModalHeader
        title="Silent Inbox"
        subtitle={totalUnread > 0 ? `${totalUnread} unread ${totalUnread === 1 ? 'message' : 'messages'}` : 'All caught up'}
        onClose={onClose}
        actions={
          groups.length > 0 && (
            <Button variant="primary" size="xs" icon={FiCheck} onClick={handleAcceptAll}>
              Accept All
            </Button>
          )
        }
      />

      <ScrollArea className="max-h-[500px] p-3 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12"><LoadingSpinner size="md" /></div>
        ) : groups.length === 0 ? (
          <EmptyState icon="silent" title="All caught up" description="No silent messages waiting" />
        ) : (
          groups.map((group) => (
            <section key={group.chatId} className="bg-surface backdrop-blur-glass border border-border rounded-2xl overflow-hidden" aria-label={`Messages from ${group.chatName}`}>
              <h4 className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-text-secondary uppercase tracking-wider border-b border-border bg-background/50">
                <FiMessageCircle size={12} />
                {group.chatName}
                <span className="text-[10px] font-normal normal-case ml-auto opacity-60">{group.messages.length} {group.messages.length === 1 ? 'message' : 'messages'}</span>
              </h4>
              <div className="divide-y divide-[var(--theme-border)]">
                {group.messages.map((msg) => (
                  <div key={msg.messageId || msg.silentMessageId} className="px-4 py-3 hover:bg-background/30 transition-colors">
                    <div className="flex items-start gap-3">
                      <Avatar src={msg.sender?.avatar} name={msg.sender?.username || '?'} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-text-primary truncate">{msg.sender?.username || 'Unknown'}</span>
                          <span className="text-[10px] text-text-secondary flex-shrink-0">{formatTime(msg.createdAt)}</span>
                          {!msg.read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" aria-label="Unread" />}
                        </div>
                        <p className="text-sm text-text-secondary mt-0.5 break-words line-clamp-2">{msg.content || (msg.type === 'image' ? '📷 Photo' : msg.type === 'file' ? '📎 File' : '')}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Button variant="primary" size="xs" onClick={() => handleAccept(msg.messageId, group.chatId)} loading={accepting[msg.messageId]} disabled={accepting[msg.messageId]} icon={FiCheck}>
                            Accept
                          </Button>
                          <Button variant="secondary" size="xs" onClick={() => { setGroups((prev) => { const updated = prev.map((g) => { if (g.chatId !== group.chatId) return g; const remaining = g.messages.filter((m) => m.messageId !== msg.messageId); return remaining.length > 0 ? { ...g, messages: remaining } : null; }).filter(Boolean); const newUnread = updated.reduce((s, g) => s + g.messages.filter((m) => !m.read).length, 0); onAccept?.({ messageId: msg.messageId, chatId: group.chatId, dismissed: true }, newUnread); return updated; }); }} icon={FiX}>
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </ScrollArea>
    </Modal>
  );
}

export default memo(SilentInboxModal);
