import { memo, useState } from 'react';
import { FiDownload, FiMaximize2 } from 'react-icons/fi';
import { getMediaCaption } from './utils/messageHelpers';

function ImageMessage({ message, onOpen }) {
  const [hasError, setHasError] = useState(false);
  const caption = getMediaCaption(message);
  const canPreview = Boolean(message.mediaUrl && !hasError);

  return <div className="w-full">
    {canPreview ? <div className="group relative overflow-hidden rounded-md bg-slate-200 dark:bg-slate-800" role="button" tabIndex="0" onClick={onOpen} onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && onOpen()} aria-label="Open image preview">
      <img className="block max-h-[340px] min-h-[140px] w-full object-cover" src={message.mediaUrl} alt="" loading="lazy" draggable="false" onError={() => setHasError(true)} />
      <div className="absolute inset-0 grid place-items-center bg-black/0 opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100" aria-hidden="true"><span className="inline-flex items-center gap-1.5 rounded-full bg-black/65 px-3 py-2 text-xs font-semibold text-white"><FiMaximize2 />Open</span></div>
      <a className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white opacity-0 transition hover:bg-black/70 group-hover:opacity-100" href={message.mediaUrl} download aria-label="Download image" onClick={(event) => event.stopPropagation()}><FiDownload /></a>
    </div> : (
      <div className="flex min-h-[132px] flex-col justify-end gap-1 rounded-md bg-primary p-4" role="img" aria-label={caption || 'Image'}>
        <span className="w-fit rounded bg-slate-950/70 px-2 py-1 text-[10px] font-extrabold tracking-wide text-white">IMG</span>
        <span className="max-w-full truncate text-sm font-semibold">{caption || message.content || 'Image'}</span>
        <span className="text-[11px] opacity-60">Preview unavailable</span>
      </div>
    )}
    {caption && <p className="m-0 px-1.5 pt-1.5 pr-14 text-sm leading-snug">{caption}</p>}
  </div>;
}

export default memo(ImageMessage);
