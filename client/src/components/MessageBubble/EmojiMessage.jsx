import { memo } from 'react';
import { motion } from 'framer-motion';

function EmojiMessage({ message }) {
  return <motion.p className="m-0 min-w-16 px-2 py-1 text-center text-5xl leading-none drop-shadow-sm" initial={{ }} animate={{ }} transition={{ type: 'spring', stiffness: 300, damping: 18 }}>{message.content || message.metadata?.emoji || ''}</motion.p>;
}

export default memo(EmojiMessage);
