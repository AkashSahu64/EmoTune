import { memo } from 'react';
import { motion } from 'framer-motion';
import { FiCheck } from 'react-icons/fi';
import ChatScreenMockup from './ChatScreenMockup';
import AIChatMockup from './AIChatMockup';
import GroupChatMockup from './GroupChatMockup';
import SecurityMockup from './SecurityMockup';

const SHOWCASE = [
  {
    title: 'Real-time Messaging',
    subtitle: 'Instant. Reliable. Everywhere.',
    desc: 'Messages deliver in milliseconds with typing indicators, read receipts, and online presence. Whether one-on-one or in groups, your conversations flow naturally.',
    features: [
      'WebSocket-powered instant delivery',
      'Typing indicators and read receipts',
      'Cross-device synchronization',
      'Online presence tracking',
    ],
    Mockup: ChatScreenMockup,
    reversed: false,
  },
  {
    title: 'AI-Powered Intelligence',
    subtitle: 'Smarter conversations, automatically.',
    desc: 'Our AI analyzes emotional context, suggests relevant responses, generates shayari, recommends music, and summarizes conversations so you never miss context.',
    features: [
      'Real-time emotion analysis',
      'Smart reply suggestions',
      'AI song and shayari generation',
      'Conversation summarization',
    ],
    Mockup: AIChatMockup,
    reversed: true,
  },
  {
    title: 'Group Collaboration',
    subtitle: 'Work and play, together.',
    desc: 'Groups come alive with DecideFlow for AI-assisted polls, Ghost Collaboration for anonymous input, shared memory search, and collaborative decision-making.',
    features: [
      'AI-powered group polls',
      'Anonymous collaboration',
      'Shared conversation search',
      'Smart notifications',
    ],
    Mockup: GroupChatMockup,
    reversed: false,
  },
  {
    title: 'Privacy & Security',
    subtitle: 'Your data. Your control.',
    desc: 'End-to-end encryption protects every message. Silent inbox for private conversations. Granular privacy controls and secure authentication.',
    features: [
      'End-to-end encryption',
      'Silent message inbox',
      'Secure authentication',
      'Privacy-first design',
    ],
    Mockup: SecurityMockup,
    reversed: true,
  },
];

const ShowcaseContent = memo(function ShowcaseContent({ section, index }) {
  return (
    <motion.div
      initial={{ }}
      whileInView={{ }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, }}
    >
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-elevated backdrop-blur-glass border border-border text-primary text-xs font-medium mb-4">
        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
        Feature {index + 1}
      </div>
      <h3 className="text-[36px] font-bold text-text-primary mb-2">{section.title}</h3>
      <p className="text-primary text-lg font-medium mb-4">{section.subtitle}</p>
      <p className="text-[17px] text-text-secondary leading-relaxed mb-6">{section.desc}</p>
      <ul className="space-y-3">
        {section.features.map((f) => (
          <li key={f} className="flex items-start gap-3 text-text-primary text-sm">
            <FiCheck className="text-success mt-0.5 flex-shrink-0" size={16} />
            {f}
          </li>
        ))}
      </ul>
    </motion.div>
  );
});

export default function ProductShowcase() {
  return (
    <section id="product" className="landing-ai-surface relative z-10 py-24 bg-landing-ai" aria-labelledby="product-title">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-primary uppercase tracking-wider mb-3">Product</p>
          <h2 id="product-title" className="text-[36px] md:text-[42px] font-bold text-text-primary mb-4">
            Built for Modern Communication
          </h2>
          <p className="text-[17px] text-text-secondary max-w-2xl mx-auto">
            Every feature designed to make your conversations smarter, faster, and more meaningful.
          </p>
        </div>

        <div className="space-y-24">
          {SHOWCASE.map((section, i) => (
            <div
              key={section.title}
              className={`flex flex-col ${section.reversed ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-12 lg:gap-16`}
            >
              <div className="flex-1 w-full max-w-[420px] lg:max-w-none">
                <motion.div
                  initial={{ }}
                  whileInView={{ }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.5 }}
                >
                  <section.Mockup />
                </motion.div>
              </div>
              <div className="flex-1">
                <ShowcaseContent section={section} index={i} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
