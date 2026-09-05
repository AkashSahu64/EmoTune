import {
  FiMessageCircle, FiZap, FiShield, FiUsers, FiSearch,
  FiBell, FiCheckCircle, FiCamera, FiMic, FiShare2,
  FiSmile, FiBarChart2, FiGlobe, FiClock, FiHeart,
  FiStar, FiLock, FiSmartphone, FiSend, FiImage,
  FiHeadphones, FiVideo, FiSliders
} from 'react-icons/fi';

export const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Product', href: '#product' },
  { label: 'How it Works', href: '#how-it-works' },
  { label: 'FAQ', href: '#faq' },
];

export const HERO_STATS = [
  { label: 'Messages Delivered', value: '10K+' },
  { label: 'Uptime', value: '99.9%' },
  { label: 'Sync Speed', value: '<100ms' },
  { label: 'Encrypted', value: 'E2EE' },
];

export const FEATURES = [
  {
    icon: FiMessageCircle,
    title: 'Real-time Messaging',
    desc: 'Instant delivery with typing indicators, read receipts, and online presence. Messages sync across all your devices in real-time.',
    benefits: ['Instant Delivery', 'Read Receipts', 'Typing Indicators'],
    color: '#3B5BFF',
  },
  {
    icon: FiZap,
    title: 'AI Chat Assistant',
    desc: 'Smart replies, emotion analysis, song suggestions, shayari generation, and AI-powered conversation summaries.',
    benefits: ['Emotion Analysis', 'Smart Replies', 'AI Summaries'],
    color: '#7C3AED',
  },
  {
    icon: FiMic,
    title: 'Voice Messages',
    desc: 'Record and send voice messages with waveform visualization. Playback controls with speed adjustment.',
    benefits: ['Waveform UI', 'Speed Control', 'Instant Playback'],
    color: '#16A34A',
  },
  {
    icon: FiVideo,
    title: 'Video & Audio Calls',
    desc: 'High-quality video and audio calls with screen sharing. Built for both one-on-one and group calls.',
    benefits: ['Screen Sharing', 'Group Calls', 'HD Quality'],
    color: '#D97706',
  },
  {
    icon: FiUsers,
    title: 'Group Chats',
    desc: 'Create groups with AI-powered features: DecideFlow for polls, shared memory search, and collaborative spaces.',
    benefits: ['AI Polls', 'Shared Search', 'Collaboration'],
    color: '#7C3AED',
  },
  {
    icon: FiSearch,
    title: 'Memory Mesh',
    desc: 'Semantic search across all conversations. Find any message, file, or context using natural language queries.',
    benefits: ['Semantic Search', 'Natural Language', 'Cross-chat'],
    color: '#0891B2',
  },
  {
    icon: FiBell,
    title: 'Silent Inbox',
    desc: 'Send messages without notifications. Recipients check at their convenience from a dedicated silent inbox.',
    benefits: ['Zero Notifications', 'Separate Inbox', 'Privacy'],
    color: '#D97706',
  },
  {
    icon: FiSmile,
    title: 'Emoji & Reactions',
    desc: 'Expressive emoji picker with GIF support from Giphy. React to messages with any emoji.',
    benefits: ['GIF Search', 'Emoji Reactions', 'Quick Picker'],
    color: '#7C3AED',
  },
  {
    icon: FiImage,
    title: 'File & Media Sharing',
    desc: 'Share images, videos, documents, and more. Built-in preview for all media types.',
    benefits: ['Drag & Drop', 'Inline Preview', 'Gallery View'],
    color: '#3B5BFF',
  },
];

export const SHOWCASE_SECTIONS = [
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
    icon: FiMessageCircle,
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
    icon: FiZap,
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
    icon: FiUsers,
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
    icon: FiShield,
    reversed: true,
  },
];

export const HOW_IT_WORKS = [
  {
    step: 1,
    title: 'Create Your Account',
    desc: 'Sign up in seconds with email or Google. No credit card required. Set up your profile and customize your preferences.',
    detail: 'Takes less than 60 seconds',
  },
  {
    step: 2,
    title: 'Connect & Chat',
    desc: 'Find friends, start one-on-one or group conversations. Send messages, voice notes, images, and files instantly.',
    detail: 'Real-time from the start',
  },
  {
    step: 3,
    title: 'Unlock AI Features',
    desc: 'Experience emotion analysis, smart replies, AI summaries, memory search, and intelligent collaboration tools.',
    detail: 'Powered by advanced AI',
  },
  {
    step: 4,
    title: 'Stay Connected Everywhere',
    desc: 'Access your conversations across all devices. Never miss a message with instant sync and smart notifications.',
    detail: 'Sync across devices',
  },
];

export const WHY_CHOOSE_US = [
  {
    icon: FiZap,
    title: 'Lightning Fast',
    desc: 'Messages deliver in milliseconds with WebSocket technology. No delays, no lag.',
  },
  {
    icon: FiLock,
    title: 'End-to-End Encrypted',
    desc: 'Your conversations are private and secure. Encrypted in transit and at rest.',
  },
  {
    icon: FiHeart,
    title: 'AI-Powered',
    desc: 'Smart features that understand emotions, suggest responses, and enhance your conversations.',
  },
  {
    icon: FiSmartphone,
    title: 'Cross-Platform',
    desc: 'Seamless experience across desktop, tablet, and mobile. Pick up where you left off.',
  },
  {
    icon: FiGlobe,
    title: 'Always Available',
    desc: '99.9% uptime with global infrastructure. Your messages are always accessible.',
  },
  {
    icon: FiSliders,
    title: 'Fully Customizable',
    desc: 'Themes, personas, notification preferences — tailor the experience to your needs.',
  },
];

export const TESTIMONIALS = [
  {
    name: 'Alex Morgan',
    role: 'Software Engineer',
    avatar: null,
    rating: 5,
    review: 'The AI emotion analysis is incredible. It understands context better than any chat app I\'ve used. The shayari feature is a fun bonus.',
  },
  {
    name: 'Sarah Chen',
    role: 'Product Designer',
    avatar: null,
    rating: 5,
    review: 'Memory Mesh changed how I work. I can search months of conversations and find exactly what I need. A game-changer for remote teams.',
  },
  {
    name: 'James Wilson',
    role: 'Startup Founder',
    avatar: null,
    rating: 5,
    review: 'DecideFlow makes group decisions effortless. No more endless polling threads. The AI handles everything.',
  },
  {
    name: 'Priya Patel',
    role: 'Digital Creator',
    avatar: null,
    rating: 4,
    review: 'Silent inbox is perfect for managing notifications. I can prioritize what matters without distractions.',
  },
  {
    name: 'Marcus Johnson',
    role: 'Community Manager',
    avatar: null,
    rating: 5,
    review: 'The GIF integration and emoji reactions make conversations lively. My community loves the expressive features.',
  },
  {
    name: 'Emily Zhang',
    role: 'Freelancer',
    avatar: null,
    rating: 4,
    review: 'Cross-device sync works flawlessly. I switch between phone and laptop without missing a beat.',
  },
];

export const FAQ_DATA = [
  {
    question: 'What is Emotume?',
    answer: 'Emotume is an AI-powered messaging platform that combines real-time chat with intelligent features like emotion analysis, smart replies, memory search, and group collaboration tools.',
  },
  {
    question: 'Is Emotume free to use?',
    answer: 'Yes, Emotume offers a generous free tier with access to all core features including real-time messaging, AI chat assistant, memory mesh, and group chats.',
  },
  {
    question: 'How does the AI emotion analysis work?',
    answer: 'Our AI analyzes message sentiment and emotional context in real-time. It can detect happiness, sadness, love, anxiety, and more, then suggest appropriate responses, music, or content.',
  },
  {
    question: 'What is Memory Mesh?',
    answer: 'Memory Mesh is our AI-powered semantic search system. It uses embeddings to index all your conversations, allowing you to search for any message or context using natural language.',
  },
  {
    question: 'How does DecideFlow work?',
    answer: 'DecideFlow creates AI-assisted polls within group chats. It analyzes preferences, suggests optimal options, and helps resolve deadlocks through intelligent voting.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Absolutely. We use end-to-end encryption for all messages, JWT-based authentication with token rotation, and follow industry security best practices.',
  },
  {
    question: 'What are Personas?',
    answer: 'Personas let you create multiple digital identities with different communication styles. Switch between professional, casual, or custom tones with AI-assisted message adaptation.',
  },
  {
    question: 'Can I use Emotume for business?',
    answer: 'Yes, Emotume is built for both personal and professional use. Features like group chats, file sharing, voice/video calls, and collaboration tools make it ideal for teams.',
  },
];

export const FOOTER_LINKS = {
  product: [
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#' },
    { label: 'Integrations', href: '#' },
    { label: 'Changelog', href: '#' },
  ],
  resources: [
    { label: 'Documentation', href: '#' },
    { label: 'API Reference', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Community', href: '#' },
  ],
  legal: [
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
    { label: 'Cookie Policy', href: '#' },
    { label: 'GDPR', href: '#' },
  ],
};

export const SOCIAL_LINKS = {
  linkedin: 'https://linkedin.com/company/emotune',
  email: 'mailto:support@emotune.app',
};
