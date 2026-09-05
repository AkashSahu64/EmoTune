import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { FiX, FiUsers, FiShield, FiClock, FiImage, FiStar, FiZap, FiLock, FiLayers, FiBarChart2 } from 'react-icons/fi';
import { Avatar, StatusDot, Section, GlassCard, Button, ScrollArea, Badge, Skeleton } from '../ui';
import { aiService, groupIntelligenceService } from '../../services/api';

export default function RightPanel({ chat, userId, onClose, onOpenSilentInbox, onOpenGhostSession, onOpenDecideFlow, onlineUsers = new Set(), onOpenPersona }) {
  const chatId = chat?._id;
  const mediaQuery = useQuery({
    queryKey: ['shared-media', chatId],
    queryFn: ({ signal }) => groupIntelligenceService.getSharedMedia(chatId, { limit: 12 }, { signal }).then(({ data }) => data),
    enabled: Boolean(chatId),
    staleTime: 60_000,
  });
  const summaryQuery = useQuery({
    queryKey: ['ai-summary', chatId],
    queryFn: ({ signal }) => aiService.getSummary(chatId, { signal }).then(({ data }) => data),
    enabled: Boolean(chatId),
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);
  if (!chat) {
    return (
      <aside className="h-full flex flex-col bg-surface dark:bg-surface-dark backdrop-blur-glass" aria-label="Chat info">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border dark:border-border-dark">
          <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">Details</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-hover/[0.07] dark:hover:bg-hover-dark/[0.07] text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark transition-colors" aria-label="Close panel" type="button"><FiX size={18} /></button>
        </div>
        <div className="flex-1 flex items-center justify-center p-4"><p className="text-sm text-text-secondary dark:text-text-secondary-dark">Select a conversation to view details.</p></div>
      </aside>
    );
  }

  const members = chat.participants || [];
  const isGroup = chat.type === 'group';

  return (
    <aside className="h-full flex flex-col" aria-label="Chat information panel">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border dark:border-border-dark">
        <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">Details</h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-hover/[0.07] dark:hover:bg-hover-dark/[0.07] text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark transition-colors" aria-label="Close panel" type="button"><FiX size={18} /></button>
      </div>

      <ScrollArea className="flex-1 p-4 space-y-5">
        <div className="text-center">
          <Avatar src={chat.type !== 'group' ? chat.otherUser?.avatar : chat.avatar} name={chat.name || 'Chat'} size="xl" ring="primary" />
          <h2 className="text-lg font-semibold text-text-primary dark:text-text-primary-dark mt-3">{chat.name || 'Chat'}</h2>
          {chat.groupDescription && <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-1">{chat.groupDescription}</p>}
          {!isGroup && chat.otherUser && (
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <StatusDot status={onlineUsers.has(chat.otherUser._id) ? 'online' : 'offline'} size="sm" />
              <span className="text-xs text-text-secondary dark:text-text-secondary-dark">{onlineUsers.has(chat.otherUser._id) ? 'Online' : 'Offline'}</span>
            </div>
          )}
        </div>

        <GlassCard className="p-3 divide-y divide-border dark:divide-border-dark" as="div">
          <div className="flex items-center gap-2.5 py-2 first:pt-0 last:pb-0">
            <FiClock size={14} className="text-text-secondary dark:text-text-secondary-dark flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-text-secondary dark:text-text-secondary-dark">Created</p>
              <p className="text-sm text-text-primary dark:text-text-primary-dark">{new Date(chat.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
          {isGroup && (
            <div className="flex items-center gap-2.5 py-2">
              <FiUsers size={14} className="text-text-secondary dark:text-text-secondary-dark flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-text-secondary dark:text-text-secondary-dark">Members</p>
                <p className="text-sm text-text-primary dark:text-text-primary-dark">{members.length} participants</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2.5 py-2">
            <FiShield size={14} className="text-text-secondary dark:text-text-secondary-dark flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-text-secondary dark:text-text-secondary-dark">Encryption</p>
              <p className="text-sm text-text-primary dark:text-text-primary-dark">End-to-end encrypted</p>
            </div>
          </div>
        </GlassCard>

        {isGroup && (
          <Section title="Members">
            <div className="space-y-1" role="list">
              {members.map((member) => (
                <motion.div key={member.user?._id || member._id} className="flex items-center gap-3 p-2.5 bg-surface dark:bg-surface-dark backdrop-blur-glass border border-border dark:border-border-dark rounded-xl transition-colors" role="listitem">
                  <Avatar src={member.user?.avatar} name={member.user?.username || 'U'} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary dark:text-text-primary-dark truncate">
                      {member.user?.username || 'Unknown'}
                      {member.user?._id === userId && <span className="text-text-secondary dark:text-text-secondary-dark"> (You)</span>}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {member.role === 'admin' && <Badge variant="glass" className="text-[8px]">Admin</Badge>}
                      <span className="text-[10px] text-text-secondary dark:text-text-secondary-dark">{member.user?.status || 'Member'}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </Section>
        )}

        <Section title="Shared media">
          {mediaQuery.isLoading ? <div className="grid grid-cols-3 gap-1.5">{[1, 2, 3].map((i) => <Skeleton key={i} lines={1} />)}</div> : (
            <div className="grid grid-cols-3 gap-1.5">
              {(mediaQuery.data?.messages || mediaQuery.data?.media || []).slice(0, 12).map((item) => (
                <a key={item._id} href={item.mediaUrl} target="_blank" rel="noreferrer" className="aspect-square rounded-xl overflow-hidden bg-surface dark:bg-surface-dark backdrop-blur-glass border border-border dark:border-border-dark flex items-center justify-center text-text-secondary dark:text-text-secondary-dark hover:bg-hover/[0.07] dark:hover:bg-hover-dark/[0.07] transition-colors" aria-label="Open shared media">
                  {item.mediaUrl ? <img src={item.mediaUrl} alt="Shared media" className="h-full w-full object-cover" loading="lazy" /> : <FiImage size={16} />}
                </a>
              ))}
              {!((mediaQuery.data?.messages || mediaQuery.data?.media || []).length) && <p className="col-span-3 text-xs text-text-secondary dark:text-text-secondary-dark">No shared media yet.</p>}
            </div>
          )}
          {mediaQuery.isError && <p className="mt-2 text-xs text-danger dark:text-danger-dark">Unable to load shared media.</p>}
        </Section>

        <Section title="Actions">
          <div className="space-y-1.5">
            <Button variant="secondary" size="sm" icon={FiZap} className="w-full justify-start" onClick={onOpenPersona}>Switch persona</Button>
            <Button variant="secondary" size="sm" icon={FiLayers} className="w-full justify-start" onClick={onOpenGhostSession}>Ghost Session</Button>
            {chat?.type === 'group' && (
              <Button variant="secondary" size="sm" icon={FiBarChart2} className="w-full justify-start" onClick={onOpenDecideFlow}>DecideFlow</Button>
            )}
            <Button variant="secondary" size="sm" icon={FiLock} className="w-full justify-start" onClick={onOpenSilentInbox}>Silent messages</Button>
            <Button variant="secondary" size="sm" icon={FiStar} className="w-full justify-start" onClick={() => {}}>Pinned messages</Button>
          </div>
        </Section>

        <Section title="AI summary">
          <GlassCard className="p-3">
            {summaryQuery.isLoading ? <Skeleton lines={3} /> : summaryQuery.isError ? <p className="text-xs text-danger dark:text-danger-dark">Summary is unavailable right now.</p> : <>
              <p className="text-xs text-text-secondary dark:text-text-secondary-dark leading-relaxed">{summaryQuery.data?.summary?.summary || summaryQuery.data?.summary || 'No summary available yet.'}</p>
              <div className="flex items-center gap-2 mt-2"><Badge variant="glass">AI Generated</Badge>{summaryQuery.data?.summary?.tone && <Badge variant="success">{summaryQuery.data.summary.tone}</Badge>}</div>
            </>}
          </GlassCard>
        </Section>
      </ScrollArea>
    </aside>
  );
}
