import { memo } from 'react';
import { FiMusic } from 'react-icons/fi';
import AudioMessage from './AudioMessage';

function SongMessage({ message }) {
  const playableMessage = message.metadata?.songClipUrl ? { ...message, mediaUrl: message.metadata.songClipUrl, _id: `${message._id}-song` } : null;
  return <div className="w-[min(320px,calc(100vw-32px))] max-w-full">
    <div className="flex items-center gap-2"><span className="grid h-10 w-10 place-items-center rounded-full bg-primary/[.15] dark:bg-primary-dark/[.15] text-primary dark:text-primary-dark"><FiMusic aria-hidden="true" /></span><div className="min-w-0"><strong className="block truncate">{message.metadata?.songTitle || message.content || 'Song'}</strong>{message.metadata?.songArtist && <small className="block opacity-70">{message.metadata.songArtist}</small>}</div></div>
    {playableMessage && <AudioMessage message={playableMessage} />}
    {message.metadata?.lyrics && <p className="mt-2 text-xs opacity-80">{message.metadata.lyrics}</p>}
    {message.content && message.content !== message.metadata?.songTitle && <p className="mt-1 text-sm">{message.content}</p>}
  </div>;
}

export default memo(SongMessage);
