import { memo } from 'react';
import { FiDownload, FiPlay } from 'react-icons/fi';
import { formatDuration } from './utils/formatters';
import { getMediaCaption } from './utils/messageHelpers';

function VideoMessage({ message, onOpen }) {
  const caption = getMediaCaption(message);
  const embedUrl = message.metadata?.videoEmbedUrl;
  return <div className="w-[min(320px,calc(100vw-32px))] max-w-full">
    {embedUrl ? <div className="aspect-video overflow-hidden rounded-xl"><iframe className="h-full w-full border-0" src={embedUrl} title={caption || 'Embedded video'} loading="lazy" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /></div> : message.mediaUrl && <div className="group relative min-h-[158px] cursor-pointer overflow-hidden rounded-xl bg-black" role="button" tabIndex="0" onClick={onOpen} onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && onOpen()} aria-label="Play video">
      <video className="block max-h-[260px] w-full object-cover" preload="metadata" muted playsInline><source src={message.mediaUrl} type={message.mediaType || 'video/mp4'} /></video>
      <span className="absolute left-1/2 top-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/[.9] text-black" aria-hidden="true"><FiPlay /></span>
      {message.metadata?.videoDuration && <span className="absolute bottom-2 right-2 rounded-full bg-black/[.6] px-1.5 py-0.5 text-[10px] text-white">{formatDuration(message.metadata.videoDuration)}</span>}
      <a className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/[.6] text-white" href={message.mediaUrl} download aria-label="Download video" onClick={(event) => event.stopPropagation()}><FiDownload /></a>
    </div>}
    {caption && <p className="m-[6px_6px_0] pr-14 text-sm leading-[1.35]">{caption}</p>}
  </div>;
}

export default memo(VideoMessage);
