import { memo } from 'react';

const BOX = 'block max-h-[220px] max-w-[220px] object-contain';

// An animated sticker saved from Sticker Studio is a WebM, so it plays as a
// looping muted video; everything else is a still image.
function StickerMessage({ message, onOpen }) {
  if (!message.mediaUrl) return null;
  const isVideo = String(message.mediaType || '').startsWith('video/');
  return <button className="block max-w-[220px] cursor-pointer border-0 bg-transparent" type="button" onClick={onOpen} aria-label="Open sticker preview">{isVideo ? <video className={BOX} src={message.mediaUrl} autoPlay loop muted playsInline aria-label="Animated sticker" /> : <img className={BOX} src={message.mediaUrl} alt="Sticker" loading="lazy" draggable="false" />}</button>;
}

export default memo(StickerMessage);
