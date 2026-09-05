import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowRight, FiCheck, FiMessageCircle, FiMic, FiSmile, FiClock, FiImage, FiBell, FiZap } from 'react-icons/fi';

const messageExamples = [
  { text: 'Hey! How are you?', time: '2 min ago', sender: 'them' },
  { text: 'Feeling great today! 🎉', time: '1 min ago', sender: 'me', emoji: true },
  { text: 'Check this out →', time: '30s ago', sender: 'them', attachment: true },
  { text: '😄', time: 'now', sender: 'me', reaction: true },
];

const suggestions = [
  'Send a voice message',
  'Share a photo',
  'Start a poll',
  '🎵 Recommend a song',
];

function ChatPreview() {
  return (
    <div className="relative w-full max-w-[340px] mx-auto">
      <div className="relative rounded-[24px] border border-border dark:border-border-dark bg-surface dark:bg-surface-dark backdrop-blur-glass overflow-hidden shadow-floating dark:shadow-floating-dark">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border dark:border-border-dark">
          <div className="w-3 h-3 rounded-full bg-success dark:bg-success-dark" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-text-primary dark:text-text-primary-dark truncate">Sarah Chen</p>
            <p className="text-[11px] text-text-secondary dark:text-text-secondary-dark">Online</p>
          </div>
          <div className="flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-primary dark:bg-primary-dark opacity-60" />
            <div className="w-2 h-2 rounded-full bg-primary dark:bg-primary-dark opacity-40" />
            <div className="w-2 h-2 rounded-full bg-primary dark:bg-primary-dark opacity-20" />
          </div>
        </div>

        <div className="p-3 space-y-2 min-h-[240px]">
          {messageExamples.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ }}
              animate={{ }}
              transition={{  duration: 0.3 }}
              className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                  msg.sender === 'me'
                    ? 'bg-primary dark:bg-primary-dark text-white rounded-tr-md'
                    : 'bg-surface-elevated dark:bg-surface-elevated-dark backdrop-blur-glass text-text-primary dark:text-text-primary-dark rounded-tl-md border border-border dark:border-border-dark'
                }`}
              >
                {msg.emoji ? (
                  <motion.p
                    className="text-[22px] leading-none"
                    animate={{}}
                    transition={{ duration: 0.4 }}
                  >
                    {msg.text}
                  </motion.p>
                ) : msg.attachment ? (
                  <div className="flex items-center gap-2">
                    <FiImage className="text-text-secondary dark:text-text-secondary-dark" size={14} />
                    <span className="text-[13px]">photo.jpeg</span>
                  </div>
                ) : msg.reaction ? (
                  <div className="flex items-center gap-1.5">
                    <motion.span
                      className="text-[22px] leading-none"
                      animate={{}}
                      transition={{ duration: 0.5 }}
                    >
                      😄
                    </motion.span>
                    <span className="text-[11px] text-text-secondary dark:text-text-secondary-dark">reacted</span>
                  </div>
                ) : (
                  <p className="text-[13px] leading-relaxed">{msg.text}</p>
                )}
                <div className={`flex items-center gap-1 mt-1 ${msg.sender === 'me' ? 'justify-end' : ''}`}>
                  <span className="text-[10px] text-text-secondary dark:text-text-secondary-dark">{msg.time}</span>
                  {msg.sender === 'me' && !msg.reaction && (
                    <FiCheck className="text-success dark:text-success-dark" size={10} />
                  )}
                </div>
              </div>
            </motion.div>
          ))}

          <motion.div
            initial={{ }}
            animate={{ }}
            transition={{  duration: 0.3 }}
            className="flex items-center gap-2 px-1"
          >
            <div className="flex gap-1">
              <span className="h-2 w-2 rounded-full bg-text-secondary dark:bg-text-secondary-dark animate-fade-in" />
              <span className="h-2 w-2 rounded-full bg-text-secondary dark:bg-text-secondary-dark animate-fade-in" />
              <span className="h-2 w-2 rounded-full bg-text-secondary dark:bg-text-secondary-dark animate-fade-in" />
            </div>
            <span className="text-[10px] text-text-secondary dark:text-text-secondary-dark">Sarah is typing...</span>
          </motion.div>
        </div>

        <div className="px-3 py-2 border-t border-border dark:border-border-dark flex items-center gap-2">
          <div className="flex-1 h-8 rounded-lg bg-surface-elevated dark:bg-surface-elevated-dark backdrop-blur-glass border border-border dark:border-border-dark flex items-center px-3">
            <span className="text-[11px] text-text-secondary dark:text-text-secondary-dark">Type a message...</span>
          </div>
          <div className="flex gap-1.5">
            <FiSmile className="text-text-secondary dark:text-text-secondary-dark" size={16} />
            <FiMic className="text-text-secondary dark:text-text-secondary-dark" size={16} />
            <FiMessageCircle className="text-primary dark:text-primary-dark" size={16} />
          </div>
        </div>

        <div className="px-3 py-2 flex items-center gap-3 text-[10px] text-text-secondary dark:text-text-secondary-dark border-t border-border dark:border-border-dark">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-success dark:bg-success-dark" />
            <span>2 online</span>
          </div>
          <FiClock size={10} />
          <span>Active now</span>
          <FiBell size={10} />
        </div>
      </div>

      {/* AI suggestion badge */}
      <motion.div
        initial={{ }}
        animate={{ }}
        transition={{  duration: 0.4 }}
        className="absolute -bottom-3 -right-3 bg-primary dark:bg-primary-dark text-white text-[10px] font-medium px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1"
      >
        <FiZap size={12} />
        AI Active
      </motion.div>
    </div>
  );
}

export default function Hero() {
  return (
    <header className="landing-hero-surface relative min-h-screen flex flex-col overflow-hidden bg-landing dark:bg-landing-dark-hero">

      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto w-full" aria-label="Main navigation">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Emotune" className="w-10 h-10 object-contain" />
          <TextLogo size="lg" showDecoration={false} className="hidden sm:inline-flex" />
        </div>

        <div className="hidden md:flex items-center gap-8">
          {['Features', 'Product', 'How it Works', 'FAQ'].map((link) => (
            <a
              key={link}
              href={`#${link.toLowerCase().replace(/\s+/g, '-')}`}
              className="text-sm text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark transition-colors"
            >
              {link}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link to="/login">
            <button className="px-5 py-2 text-sm font-medium text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark transition-colors" type="button">
              Sign In
            </button>
          </Link>
          <Link to="/signup">
            <button className="px-5 py-2 text-sm font-medium text-white bg-primary dark:bg-primary-dark hover:bg-primary dark:hover:bg-primary-dark rounded-xl transition-colors shadow-lg shadow-primary/20 dark:shadow-primary-dark/20" type="button">
              Get Started
            </button>
          </Link>
        </div>
      </nav>

      <div className="relative z-10 flex-1 flex items-center">
        <div className="max-w-7xl mx-auto px-6 w-full">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            <div className="flex-1 text-center lg:text-left">
              <motion.div
                initial={{ }}
                animate={{ }}
                transition={{ duration: 0.5 }}
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-elevated dark:bg-surface-elevated-dark backdrop-blur-glass border border-border dark:border-border-dark text-text-secondary dark:text-text-secondary-dark text-xs font-medium mb-6">
                  <div className="w-1.5 h-1.5 rounded-full bg-success dark:bg-success-dark" />
                  AI-Powered Messaging Platform
                </div>

                <h1 className="text-[56px] md:text-[64px] font-bold leading-[1.1] text-text-primary dark:text-text-primary-dark mb-6 tracking-tight">
                  Intelligent{' '}
                  <span className="text-primary dark:text-primary-dark">Messaging</span>
                  <br />
                  for the Modern Era
                </h1>

                <p className="text-lg md:text-xl text-text-secondary dark:text-text-secondary-dark mb-10 max-w-[560px] leading-relaxed">
                  Real-time chat powered by AI. Emotion analysis, smart replies, memory search, and group collaboration — all in one secure platform.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <Link to="/signup">
                    <button
                      className="inline-flex items-center gap-2 px-8 py-4 text-base font-medium text-white bg-primary dark:bg-primary-dark hover:bg-primary dark:hover:bg-primary-dark rounded-xl transition-colors shadow-lg shadow-primary/25 dark:shadow-primary-dark/25"
                      type="button"
                    >
                      Start Chatting Free
                      <FiArrowRight size={18} />
                    </button>
                  </Link>
                  <Link to="/login">
                    <button
                      className="inline-flex items-center gap-2 px-8 py-4 text-button font-medium text-text-primary dark:text-text-primary-dark bg-surface-elevated dark:bg-surface-elevated-dark backdrop-blur-glass border border-border dark:border-border-dark hover:bg-surface-floating dark:hover:bg-surface-floating-dark rounded-md transition-colors"
                      type="button"
                    >
                      <FiMessageCircle size={18} />
                      View Demo
                    </button>
                  </Link>
                </div>

                <div className="flex items-center gap-6 mt-8 justify-center lg:justify-start">
                  <div className="flex -space-x-2">
                    {['#3B5BFF', '#16A34A', '#D97706', '#7C3AED', '#7C3AED'].map((color, i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-full border-2 border-background dark:border-background-dark flex items-center justify-center text-white text-[10px] font-bold"
                        style={{ backgroundColor: color }}
                      >
                        {['S', 'A', 'J', 'P', 'M'][i]}
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-text-secondary dark:text-text-secondary-dark">
                    <span className="text-text-primary dark:text-text-primary-dark font-medium">2,000+</span> active users
                  </p>
                </div>
              </motion.div>
            </div>

            <div className="flex-1 w-full max-w-[400px] lg:max-w-none">
              <motion.div
                initial={{ }}
                animate={{ }}
                transition={{ duration: 0.6, }}
              >
                <ChatPreview />
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
import TextLogo from '../common/TextLogo';
