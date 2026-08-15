import { motion } from 'framer-motion';
import {
  FiBookmark,
  FiCheckCircle,
  FiClock,
  FiFile,
  FiHeart,
  FiImage,
  FiLock,
  FiMessageCircle,
  FiMusic,
  FiSearch,
  FiShield,
  FiStar,
  FiUsers,
  FiVideo,
  FiZap,
} from 'react-icons/fi';

const iconMap = {
  chat: FiMessageCircle,
  search: FiSearch,
  bookmark: FiBookmark,
  message: FiMessageCircle,
  music: FiMusic,
  video: FiVideo,
  emoji: FiHeart,
  file: FiFile,
  image: FiImage,
  lock: FiLock,
  star: FiStar,
  heart: FiHeart,
  ghost: FiShield,
  ai: FiZap,
  brain: FiZap,
  silent: FiShield,
  group: FiUsers,
  person: FiUsers,
  check: FiCheckCircle,
  clock: FiClock,
};

export default function EmptyState({
  icon = 'chat',
  title,
  description,
  action,
  className = '',
}) {
  const Icon = iconMap[icon] || FiMessageCircle;

  return (
    <motion.div
      initial={{ }}
      animate={{ }}
      className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}
    >
      <div className="relative w-20 h-20 mb-5 rounded-[22px] bg-surface backdrop-blur-glass border border-border flex items-center justify-center text-primary shadow-sm" aria-hidden="true">
        <div className="absolute inset-3 rounded-2xl bg-primary/8" />
        <Icon size={30} className="relative" />
      </div>
      {title && (
        <h3 className="text-base font-semibold text-text-primary mb-1">{title}</h3>
      )}
      {description && (
        <p className="text-sm text-text-secondary max-w-[280px] leading-relaxed">{description}</p>
      )}
      {action && (
        <div className="mt-5">{action}</div>
      )}
    </motion.div>
  );
}
