import { memo } from 'react';

function StickerMessage({ message, onOpen }) {
  if (!message.mediaUrl) return null;
  return <button className="block max-w-[220px] cursor-pointer border-0 bg-transparent" type="button" onClick={onOpen} aria-label="Open sticker preview"><img className="block max-h-[220px] max-w-[220px] object-contain" src={message.mediaUrl} alt="Sticker" loading="lazy" draggable="false" /></button>;
}

export default memo(StickerMessage);
