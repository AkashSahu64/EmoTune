import { motion } from 'framer-motion';
import { FiX, FiClock, FiCheck, FiEye, FiSend, FiEdit2, FiUser, FiShield, FiStar, FiShare2 } from 'react-icons/fi';
import { Modal, ModalHeader, GlassCard, Badge, Divider, Tag } from '../ui';

export default function MessageInfoModal({ message, userId, onClose }) {
  if (!message) return null;

  const time = message.createdAt ? new Date(message.createdAt).toLocaleString() : 'Unknown';
  const editedTime = message.editedAt ? new Date(message.editedAt).toLocaleString() : null;
  const isOwn = message.sender?._id === userId || message.sender === userId;

  const readBy = message.readBy || [];
  const deliveredTo = message.deliveredTo || [];

  const timeline = [
    { icon: FiSend, label: 'Sent', time: message.createdAt, color: 'var(--theme-primary)' },
    ...(message.deliveredTo?.length > 0 ? [{ icon: FiCheck, label: 'Delivered', time: message.createdAt, color: 'var(--theme-success)' }] : []),
    ...(message.readBy?.length > 0 ? [{ icon: FiEye, label: 'Read', time: message.createdAt, color: 'var(--theme-success)' }] : []),
    ...(message.editedAt ? [{ icon: FiEdit2, label: 'Edited', time: message.editedAt, color: 'var(--theme-warning)' }] : []),
  ];

  return (
    <Modal isOpen onClose={onClose} size="sm">
      <ModalHeader title="Message Details" subtitle="Analytics and information" onClose={onClose} />

      <div className="p-4 space-y-4">
        <GlassCard className="p-3">
          <p className="text-xs text-text-secondary mb-1.5 font-medium">Content</p>
          <p className="text-sm text-text-primary whitespace-pre-wrap break-words">{message.content || message.metadata?.emoji || '(media message)'}</p>
        </GlassCard>

        <div className="space-y-3">
          <div className="flex items-center gap-3 py-2 px-3 bg-surface backdrop-blur-glass border border-border rounded-xl">
            <FiSend size={16} className="text-primary flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-text-secondary">Type</p>
              <p className="text-sm text-text-primary capitalize">{message.type || 'text'}</p>
            </div>
            {message.personaUsed && (
              <Badge variant="default" className="flex-shrink-0">{message.personaUsed}</Badge>
            )}
          </div>

          {isOwn && (
            <>
              <div className="flex items-center gap-3 py-2 px-3 bg-surface backdrop-blur-glass border border-border rounded-xl">
                <FiCheck size={16} className="text-success flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-text-secondary">Delivered to</p>
                  <p className="text-sm text-text-primary">{deliveredTo.length} {deliveredTo.length === 1 ? 'recipient' : 'recipients'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 py-2 px-3 bg-surface backdrop-blur-glass border border-border rounded-xl">
                <FiEye size={16} className="text-success flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-text-secondary">Read by</p>
                  <p className="text-sm text-text-primary">{readBy.length} {readBy.length === 1 ? 'recipient' : 'recipients'}</p>
                </div>
              </div>
            </>
          )}
        </div>

        <Divider />

        <div>
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Timeline</p>
          <div className="space-y-0">
            {timeline.map((item, i) => (
              <div key={i} className="flex items-start gap-3 pb-3 relative">
                {i < timeline.length - 1 && <div className="absolute left-[15px] top-7 bottom-0 w-px bg-[var(--theme-border)]" />}
                <div className="w-8 h-8 rounded-full bg-surface backdrop-blur-glass border border-border flex items-center justify-center flex-shrink-0 relative z-10" style={{ color: item.color }}>
                  <item.icon size={14} />
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <p className="text-sm font-medium text-text-primary">{item.label}</p>
                  <p className="text-xs text-text-secondary">{item.time ? new Date(item.time).toLocaleString() : 'Pending'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {message.truthClaimRef && (
          <GlassCard className="p-3">
            <p className="text-xs text-text-secondary mb-1">TruthSync</p>
            <Tag color="primary">Fact-checked by AI</Tag>
          </GlassCard>
        )}

        {message.metadata?.forwardedFrom && (
          <GlassCard className="p-3 flex items-center gap-2.5">
            <FiShare2 size={14} className="text-text-secondary" />
            <p className="text-xs text-text-primary">Forwarded from {message.metadata.forwardedFrom}</p>
          </GlassCard>
        )}
      </div>
    </Modal>
  );
}
