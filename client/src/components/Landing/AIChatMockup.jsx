import { memo } from 'react';
import { motion } from 'framer-motion';
import { ChatHeader, Bubble, DeviceFrame } from './ChatPrimitives';

const aiSuggestions = [
  { text: 'Sounds great! Count me in 😊', label: 'Friendly' },
  { text: 'I\'ll review and get back to you.', label: 'Professional' },
  { text: 'That\'s amazing news! 🎉', label: 'Excited' },
];

const chatMessages = [
  { text: 'I just got the results from the campaign!', time: '2:15 PM', sent: false },
  { text: 'How did it go?', time: '2:16 PM', sent: true, status: 'seen' },
  { text: 'We exceeded our targets by 40%! 🚀', time: '2:17 PM', sent: false },
];

export default memo(function AIChatMockup() {
  return (
    <DeviceFrame type="phone">
      <ChatHeader name="Sarah Chen" online avatarColor="var(--color-ai)" />
      <div className="p-3 min-h-[360px]">
        {chatMessages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ }}
            animate={{ }}
            transition={{  duration: 0.2 }}
          >
            <Bubble sent={msg.sent} time={msg.time} status={msg.status}>
              {msg.text}
            </Bubble>
          </motion.div>
        ))}

        <motion.div
          initial={{ }}
          animate={{ }}
          transition={{  duration: 0.3 }}
          className="mt-3 p-3 rounded-2xl bg-primary border border-primary/20"
        >
          <div className="flex items-center gap-1.5 mb-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-primary"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
            <span className="text-[11px] font-semibold text-primary">AI Smart Reply</span>
          </div>
          <div className="space-y-1.5">
            {aiSuggestions.map((s, i) => (
              <motion.button
                key={s.label}
                initial={{ }}
                animate={{ }}
                transition={{  duration: 0.2 }}
                className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-surface-elevated backdrop-blur-glass border border-border hover:border-primary/40 transition-colors text-left"
                type="button"
              >
                <span className="text-[11px] text-text-primary">{s.text}</span>
                <span className="text-[8px] text-text-secondary">{s.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ }}
          animate={{ }}
          transition={{  duration: 0.3 }}
          className="mt-2 flex items-center gap-2 px-1"
        >
          <span className="text-[9px] text-primary">✨</span>
          <span className="text-[9px] text-text-secondary">AI detected:</span>
          <span className="text-[9px] text-text-primary font-medium">Excitement</span>
        </motion.div>
      </div>
    </DeviceFrame>
  );
});
