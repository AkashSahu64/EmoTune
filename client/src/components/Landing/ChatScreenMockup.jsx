import { memo } from 'react';
import { motion } from 'framer-motion';
import { ChatHeader, Bubble, BubbleReaction, TypingDots, DateSeparator, DeviceFrame } from './ChatPrimitives';

const messages = [
  { text: 'Hey! Are you coming to the meetup today?', time: '10:23 AM', sent: false },
  { text: 'Hey! Yes, I\'ll be there. What time does it start?', time: '10:25 AM', sent: true, status: 'seen' },
  { text: 'Starts at 6 PM at the usual spot ☕', time: '10:26 AM', sent: false },
  { text: 'Perfect! I\'ll bring my camera 📸', time: '10:27 AM', sent: true, status: 'seen' },
  { text: 'Awesome! See you there 🙌', time: '10:28 AM', sent: false },
];

export default memo(function ChatScreenMockup() {
  return (
    <DeviceFrame type="phone">
      <ChatHeader name="Alex Rivera" online avatarColor="#16A34A" />
      <div className="p-3 min-h-[360px]">
        <DateSeparator date="Today" />
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ }}
            animate={{ }}
            transition={{  duration: 0.2 }}
          >
            <Bubble sent={msg.sent} time={msg.time} status={msg.status}>
              {msg.text}
            </Bubble>
            {i === 1 && (
              <div className="flex justify-end -mt-2 mb-1 mr-2">
                <BubbleReaction emoji="❤️" count={1} />
              </div>
            )}
          </motion.div>
        ))}
        <motion.div
          initial={{ }}
          animate={{ }}
          transition={{  duration: 0.3 }}
          className="flex items-center gap-2 pl-1 mt-1"
        >
          <TypingDots />
          <span className="text-[10px] text-text-secondary dark:text-text-secondary-dark">Alex is typing...</span>
        </motion.div>
      </div>
      <div className="px-3 py-2 border-t border-border dark:border-border-dark flex items-center gap-2">
        <div className="flex-1 h-8 rounded-lg bg-surface-elevated dark:bg-surface-elevated-dark backdrop-blur-glass border border-border dark:border-border-dark flex items-center px-2.5">
          <span className="text-[11px] text-text-secondary dark:text-text-secondary-dark">Type a message...</span>
        </div>
        <div className="w-7 h-7 rounded-lg bg-primary dark:bg-primary-dark flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
        </div>
      </div>
    </DeviceFrame>
  );
});
