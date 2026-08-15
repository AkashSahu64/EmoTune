import { memo } from 'react';
import { motion } from 'framer-motion';
import { Bubble, BubbleReaction, DeviceFrame } from './ChatPrimitives';

const members = [
  { name: 'A', color: 'var(--theme-primary)' },
  { name: 'S', color: 'var(--theme-success)' },
  { name: 'J', color: 'var(--theme-warning)' },
  { name: 'M', color: 'var(--color-ai)' },
  { name: 'R', color: 'var(--color-ai)' },
];

const messages = [
  { text: 'Where should we go for dinner tonight? 🍕', time: '7:12 PM', sent: false, sender: 'J' },
  { text: 'I\'m voting for the new Italian place!', time: '7:14 PM', sent: false, sender: 'S' },
  { text: 'Same here 🍝', time: '7:15 PM', sent: true, status: 'seen' },
  { text: 'Let\'s do a poll!', time: '7:16 PM', sent: false, sender: 'M' },
];

export default memo(function GroupChatMockup() {
  return (
    <DeviceFrame type="phone">
      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-border bg-surface backdrop-blur-glass">
        <div className="relative w-8 h-8 flex">
          {members.slice(0, 2).map((m, i) => (
            <div
              key={m.name}
              className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold border border-[var(--theme-surface)] ${i === 0 ? 'z-10' : '-ml-2'}`}
              style={{ backgroundColor: m.color }}
            >
              {m.name}
            </div>
          ))}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold text-text-primary truncate">Weekend Plans</p>
          <p className="text-[9px] text-text-secondary">5 members, 3 online</p>
        </div>
      </div>

      <div className="p-3 min-h-[360px]">
        <div className="flex items-center gap-2 mb-3 p-2.5 rounded-xl bg-surface-elevated backdrop-blur-glass border border-border">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--theme-warning)"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
          <span className="text-[10px] text-text-secondary flex-1">Pinned: Restaurant list for tonight</span>
        </div>

        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ }}
            animate={{ }}
            transition={{  duration: 0.2 }}
          >
            {msg.sent ? (
              <Bubble sent time={msg.time} status={msg.status}>
                {msg.text}
              </Bubble>
            ) : (
              <div className="flex items-start gap-2 mb-1.5">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0 mt-0.5" style={{ backgroundColor: members.find(m => m.name === msg.sender)?.color }}>
                  {msg.sender}
                </div>
                <div
                  className="max-w-[75%] px-3 py-2 rounded-2xl rounded-bl-sm bg-surface-elevated backdrop-blur-glass border border-border"
                >
                  <p className="text-[10px] font-semibold text-primary mb-0.5">{msg.sender}</p>
                  <p className="text-[12px] text-text-primary leading-relaxed">{msg.text}</p>
                  <span className="text-[9px] text-text-secondary">{msg.time}</span>
                </div>
              </div>
            )}
          </motion.div>
        ))}

        <motion.div
          initial={{ }}
          animate={{ }}
          transition={{  duration: 0.3 }}
          className="p-3 rounded-xl bg-surface-elevated backdrop-blur-glass border border-border flex items-center gap-3"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--theme-primary)"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>
          <div className="flex-1">
            <p className="text-[11px] font-medium text-text-primary">DecideFlow Poll</p>
            <p className="text-[10px] text-text-secondary">Where to eat? · 4 votes</p>
          </div>
          <div className="flex -space-x-1">
            {members.slice(0, 3).map(m => (
              <div key={m.name} className="w-5 h-5 rounded-full border border-[var(--theme-surface)] flex items-center justify-center text-white text-[7px] font-bold" style={{ backgroundColor: m.color }}>{m.name}</div>
            ))}
          </div>
        </motion.div>

        <div className="flex justify-end -mt-2 mr-4">
          <BubbleReaction emoji="🔥" count={3} />
        </div>
      </div>
    </DeviceFrame>
  );
});
