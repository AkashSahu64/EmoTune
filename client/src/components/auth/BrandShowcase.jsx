import { memo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import TextLogo from "../common/TextLogo";

const DEMO_CONVERSATIONS = [
  [
    {
      text: "I've been thinking about our conversation yesterday...",
      sent: false,
      
      time: "10:32 AM",
    },
    {
      text: "About the career change? What's on your mind?",
      sent: true,
      
      time: "10:33 AM",
    },
    {
      text: "Yeah, I think I'm going to take the leap",
      sent: false,
      
      time: "10:34 AM",
    },
    {
      text: "That's incredible! 🚀 I can feel your excitement!",
      sent: true,
      
      time: "10:34 AM",
    },
    {
      text: "Your confidence levels just went up 23%. This is a big moment!",
      sent: true,
      
      time: "10:35 AM",
      reaction: "🎉",
    },
  ],
  [
    {
      text: "This song reminds me of you",
      sent: false,
      
      time: "2:15 PM",
    },
    {
      text: "🎵 I sense you're feeling nostalgic. Here's something perfect...",
      sent: true,
      
      time: "2:16 PM",
    },
    {
      text: "How did you know I needed this today?",
      sent: false,
      
      time: "2:17 PM",
    },
    {
      text: "Your emotions tell me everything 😊 Sentiment: Joyful (94%)",
      sent: true,
      
      time: "2:17 PM",
    },
  ],
  [
    {
      text: "Can you help me draft this email?",
      sent: false,
      
      time: "4:00 PM",
    },
    {
      text: "Of course! Analyzing context and tone...",
      sent: true,
      
      time: "4:01 PM",
    },
    {
      text: "I've enhanced it with a more professional tone while keeping your voice authentic",
      sent: true,
      
      time: "4:02 PM",
    },
    {
      text: "This is perfect. Thank you!",
      sent: false,
      
      time: "4:03 PM",
    },
    {
      text: "Glad you love it! Your writing style is becoming more confident each day 📈",
      sent: true,
      
      time: "4:03 PM",
      reaction: "💫",
    },
  ],
];

const EMOTION_SEQUENCES = [
  { emoji: "😊", label: "Joy", confidence: 94, color: "var(--theme-success)" },
  { emoji: "🤔", label: "Curiosity", confidence: 88, color: "var(--theme-primary)" },
  { emoji: "🎨", label: "Creativity", confidence: 91, color: "var(--color-ai)" },
  { emoji: "💪", label: "Determination", confidence: 85, color: "var(--theme-warning)" },
];

const FEATURES = [
  {
    icon: "🧠",
    title: "Emotion Detection",
    desc: "Real-time sentiment analysis that understands how you feel",
    status: "Live",
  },
  {
    icon: "💬",
    title: "Smart Replies",
    desc: "Context-aware suggestions that match your conversation flow",
    status: "AI",
  },
  {
    icon: "🎵",
    title: "Mood Music",
    desc: "Personalized recommendations based on your emotional state",
    status: "Beta",
  },
  {
    icon: "📝",
    title: "AI Summary",
    desc: "Instant conversation summaries with key insights extracted",
    status: "Live",
  },
];

const TYPING_INDICATORS = [
  { text: "Analyzing emotion...", dots: 1 },
  { text: "Understanding context...", dots: 2 },
  { text: "Crafting response...", dots: 3 },
];

const AVATARS = [
  { bg: "bg-primary", letter: "E", label: "Emotune AI" },
  { bg: "bg-ai", letter: "U", label: "User" },
];

const STATS_TARGETS = {
  conversations: 12847,
  emotions: 89234,
  users: 5432,
};

const bubbleVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (delay) => ({
    opacity: 1,
    y: 0,
    transition: { delay, duration: 0.45, ease: [0.25, 0.1, 0.25, 1] },
  }),
};

function TypingDots() {
  const [indicatorIndex, setIndicatorIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndicatorIndex((prev) => (prev + 1) % TYPING_INDICATORS.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      initial={{ }}
      animate={{ }}
      exit={{ }}
      className="flex items-center gap-2.5 px-4 py-2.5"
    >
      <div className="flex items-center gap-1">
        {[...Array(3)].map((_, i) => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-primary"
            animate={{}}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
      <span className="text-[11px] text-text-secondary font-medium">
        {TYPING_INDICATORS[indicatorIndex].text}
      </span>
    </motion.div>
  );
}

function ConversationPreview({ conversation, isVisible }) {
  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          key={conversation[0]?.text}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
          className="absolute inset-0 flex flex-col justify-end p-5 gap-2.5"
        >
          <div className="flex items-center gap-2 px-1 mb-2">
            <div className="h-px flex-1 bg-[var(--theme-border)]" />
            <span className="text-[9px] text-text-muted font-medium px-2">
              New messages
            </span>
            <div className="h-px flex-1 bg-[var(--theme-border)]" />
          </div>

          {conversation.map((msg, i) => (
            <motion.div
              key={i}
              custom={i * 0.16}
              variants={bubbleVariants}
              initial="hidden"
              animate="visible"
              className={`flex items-end gap-2.5 ${msg.sent ? "justify-end" : "justify-start"}`}
            >
              {!msg.sent && i === 0 && (
                <motion.div
                  initial={{}}
                  animate={{}}
                  transition={{
                    
                    type: "spring",
                    stiffness: 200,
                  }}
                  className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-[11px] font-bold text-white shadow-lg shadow-[var(--theme-primary)]/30 flex-shrink-0"
                >
                  E
                </motion.div>
              )}
              {msg.sent && i === 0 && (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-[11px] font-bold text-white shadow-lg shadow-[var(--color-ai)]/30 flex-shrink-0 order-1">
                  U
                </div>
              )}
              <div className={`max-w-[80%] ${msg.sent ? "order-0" : ""}`}>
                <div
                  className={`px-4 py-3 rounded-2xl text-[13px] leading-relaxed shadow-lg ${
                    msg.sent
                      ? "rounded-br-md bg-primary text-white shadow-[var(--theme-primary)]/25"
                      : "rounded-bl-md bg-surface-elevated/90 backdrop-blur-glass border border-border text-text-secondary shadow-black/20"
                  }`}
                >
                  <p>{msg.text}</p>
                </div>
                <div
                  className={`flex items-center gap-2 mt-1 ${msg.sent ? "justify-end" : "justify-start"}`}
                >
                  <span className="text-[9px] text-text-muted">{msg.time}</span>
                  {msg.reaction && (
                    <motion.span
                      initial={{}}
                      animate={{}}
                      transition={{
                        
                        type: "spring",
                        stiffness: 200,
                      }}
                      className="text-[11px] bg-surface backdrop-blur-glass border border-border rounded-full px-1.5 py-0.5 shadow-sm"
                    >
                      {msg.reaction}
                    </motion.span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}

          <motion.div
            initial={{ }}
            animate={{ }}
            transition={{
              
              duration: 0.3,
            }}
          >
            <TypingDots />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function LiveAIShowcase() {
  const [convIndex, setConvIndex] = useState(0);

  useEffect(() => {
    // Demo messages do not carry a delay field. Use a deterministic duration
    // so the preview never schedules an immediate hide/remount cycle.
    const totalDuration = DEMO_CONVERSATIONS[convIndex].length * 1.8 + 6;
    const timer = setTimeout(() => {
      setConvIndex((prev) => (prev + 1) % DEMO_CONVERSATIONS.length);
    }, totalDuration * 1000);
    return () => clearTimeout(timer);
  }, [convIndex]);

  return (
    <div className="relative w-full max-w-[660px]">
      <div className="rounded-[20px] border border-border overflow-hidden bg-background/60 shadow-floating shadow-black/40 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-background/70">
          <div className="flex items-center gap-2.5">
            <motion.div
              className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-[13px] font-bold text-white shadow-lg shadow-[var(--theme-primary)]/30"
              animate={{}}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              E
            </motion.div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-text-primary">
                  Emotune AI
                </span>
                <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-primary/20 text-primary border border-primary/20">
                  AI
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                <span className="text-[10px] text-success font-medium">
                  Online
                </span>
                <span className="text-[9px] text-text-muted">·</span>
                <span className="text-[9px] text-text-muted">3 active</span>
              </div>
            </div>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-text-muted font-medium uppercase tracking-wider">
              Live Demo
            </span>
            <motion.div
              className="w-2 h-2 rounded-full bg-success"
              animate={{ }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </div>
        </div>

        <div className="relative h-[460px] overflow-hidden">
          <ConversationPreview
            conversation={DEMO_CONVERSATIONS[convIndex]}
            isVisible
          />
        </div>
      </div>
    </div>
  );
}

function EmotionWidget() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => setCurrent((prev) => (prev + 1) % EMOTION_SEQUENCES.length),
      4000,
    );
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ }}
          animate={{ }}
          exit={{ }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl bg-surface/80 backdrop-blur-glass border border-border backdrop-blur-sm"
        >
          <motion.span
            className="text-2xl"
            animate={{}}
            transition={{ duration: 0.5, }}
          >
            {EMOTION_SEQUENCES[current].emoji}
          </motion.span>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] font-semibold text-text-primary">
                {EMOTION_SEQUENCES[current].label}
              </span>
              <span className="text-[11px] text-primary font-mono font-semibold">
                {EMOTION_SEQUENCES[current].confidence}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-surface-elevated backdrop-blur-glass overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  backgroundColor: EMOTION_SEQUENCES[current].color,
                }}
                initial={{ width: 0 }}
                animate={{
                  width: `${EMOTION_SEQUENCES[current].confidence}%`,
                }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function AIAccuracyCard() {
  const [accuracy, setAccuracy] = useState(0);

  useEffect(() => {
    const target = 97.4;
    const duration = 2500;
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAccuracy(Math.min(target * eased, target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    const raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="rounded-xl bg-surface/80 backdrop-blur-glass border border-border backdrop-blur-sm px-4 py-3.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] text-text-secondary font-medium">
          AI Accuracy
        </span>
        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-success/15 text-success border border-[var(--theme-success)]/20">
          Live
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-[22px] font-bold text-text-primary font-mono tracking-tight">
          {accuracy.toFixed(1)}
        </span>
        <span className="text-[13px] text-success font-semibold">%</span>
      </div>
      <div className="h-1 rounded-full bg-surface-elevated backdrop-blur-glass overflow-hidden mt-2">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${accuracy}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function FeatureCards() {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {FEATURES.map((f, i) => (
        <motion.div
          key={f.title}
          initial={{ }}
          animate={{ }}
          transition={{  duration: 0.4 }}
          className="group relative rounded-xl bg-surface/60 backdrop-blur-glass border border-border backdrop-blur-sm px-4 py-3.5 overflow-hidden hover:border-primary/30 transition-colors duration-normal"
        >
          <div className="absolute inset-0 bg-primary opacity-0 group-hover:opacity-100 transition-opacity duration-normal" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg">{f.icon}</span>
              <span className="px-1.5 py-0.5 rounded text-[7px] font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/20">
                {f.status}
              </span>
            </div>
            <h4 className="text-[12px] font-semibold text-text-primary mb-0.5">
              {f.title}
            </h4>
            <p className="text-[10px] text-text-secondary leading-relaxed">
              {f.desc}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function LiveStats() {
  const [stats, setStats] = useState({
    conversations: 0,
    emotions: 0,
    users: 0,
  });

  useEffect(() => {
    const duration = 3000;
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setStats({
        conversations: Math.floor(STATS_TARGETS.conversations * eased),
        emotions: Math.floor(STATS_TARGETS.emotions * eased),
        users: Math.floor(STATS_TARGETS.users * eased),
      });
      if (progress < 1) requestAnimationFrame(animate);
    };
    const raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  const items = [
    { label: "Conversations", value: stats.conversations.toLocaleString() },
    { label: "Emotions", value: stats.emotions.toLocaleString() },
    { label: "Users", value: stats.users.toLocaleString() },
  ];

  return (
    <div className="flex items-center rounded-xl bg-surface/60 backdrop-blur-glass border border-border backdrop-blur-sm px-3 py-[9px]">
      {items.map((s, i) => (
        <div key={s.label} className="flex-1 text-center">
          <p className="text-xl font-bold text-text-primary font-mono tracking-tight leading-none">
            {s.value}
            <span className="text-primary ml-0.5">+</span>
          </p>
          <p className="text-[10px] text-text-secondary mt-1 font-medium">
            {s.label}
          </p>
          {i < items.length - 1 && (
            <div className="hidden sm:block absolute right-0 top-1/2 -translate-y-1/2 w-px h-8 bg-[var(--theme-border)]" />
          )}
        </div>
      ))}
    </div>
  );
}

const TrustRow = memo(function TrustRow() {
  return (
    <div className="flex items-center gap-6">
      <div className="flex -space-x-2">
        {["var(--theme-primary)", "var(--theme-success)", "var(--theme-warning)", "var(--theme-danger)", "var(--color-ai)"].map((c, i) => (
          <motion.div
            key={i}
            initial={{}}
            animate={{}}
            transition={{ }}
            className="w-6 h-6 rounded-full border-2 border-[var(--theme-bg)]"
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <span className="text-[11px] text-text-muted font-medium">
        Trusted by <span className="text-text-secondary">12,000+</span> users
        worldwide
      </span>
    </div>
  );
});

export default memo(function BrandShowcase() {
  return (
    <div className="hidden lg:flex w-[48%] min-h-screen bg-transparent overflow-hidden relative flex-shrink-0">
      <div className="relative z-10 flex flex-col w-full h-full px-10 xl:px-14 py-8 overflow-y-auto scrollbar-hide">
        <motion.div
          initial={{ }}
          animate={{ }}
          transition={{ duration: 0.5 }}
          className="flex-shrink-0"
        >
          <TextLogo size="lg" showDecoration />
        </motion.div>

        <div className="flex-1 flex flex-col gap-5 mt-6">
          <motion.div
            initial={{ }}
            animate={{ }}
            transition={{  duration: 0.5 }}
          >
            <h1 className="text-[52px] font-bold text-text-primary leading-[1.04] tracking-[-0.03em]">
              <span>Understand </span>
              <span className="text-primary">
                Emotions
              </span>
              <br />
              <span>Like Never Before</span>
            </h1>
            <p className="text-[17px] text-text-secondary leading-relaxed mt-3 max-w-[520px]">
              Real-time emotion detection, smart replies, and AI-powered
              conversations that understand you deeply.
            </p>
          </motion.div>

          <motion.div
            initial={{ }}
            animate={{ }}
            transition={{  duration: 0.5 }}
          >
            <LiveAIShowcase />
          </motion.div>

          <div className="grid grid-cols-3 gap-3">
            <motion.div
              className="col-span-1"
              initial={{ }}
              animate={{ }}
              transition={{  duration: 0.4 }}
            >
              <EmotionWidget />
            </motion.div>

            <motion.div
              className="col-span-2"
              initial={{ }}
              animate={{ }}
              transition={{  duration: 0.4 }}
            >
              {/* <AIAccuracyCard /> */}
              <LiveStats />
            </motion.div>
          </div>

          {/* <motion.div
            initial={{ }}
            animate={{ }}
            transition={{  duration: 0.4 }}
          >
            <FeatureCards />
          </motion.div> */}

          {/* <motion.div
            initial={{ }}
            animate={{ }}
            transition={{  duration: 0.4 }}
          >
            <LiveStats />
          </motion.div> */}

          <motion.div
            initial={{ }}
            animate={{ }}
            transition={{  duration: 0.5 }}
            className="pb-2"
          >
            <TrustRow />
          </motion.div>
        </div>
      </div>
    </div>
  );
});
