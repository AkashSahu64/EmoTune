import { memo } from 'react';
import { FiArchive, FiDownload, FiEye, FiFile, FiFileText, FiLayers, FiTable } from 'react-icons/fi';
import { canPreviewDocument, getFilePresentation } from './utils/fileHelpers';
import { formatFileSize } from './utils/formatters';
import { getFileName } from './utils/messageHelpers';

const ICONS = { pdf: FiFileText, word: FiFileText, sheet: FiTable, slides: FiLayers, archive: FiArchive, file: FiFile };

function FileMessage({ message, document = false, onOpen }) {
  const name = getFileName(message);
  const presentation = getFilePresentation(name);
  const Icon = ICONS[presentation.kind];
  const previewable = document && canPreviewDocument(name) && message.mediaUrl;
  return <div className="flex items-center gap-2 overflow-hidden rounded-xl bg-black/[.1] p-2">
    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[10px]" style={{ color: presentation.color, background: presentation.background }}><Icon aria-hidden="true" className="h-[25px] w-[25px]" /><small className="text-[8px] font-extrabold">{presentation.extension || 'FILE'}</small></span>
    <span className="flex min-w-0 flex-1 flex-col"><strong className="truncate text-[13px]" title={name}>{name}</strong><span className="text-[11px] opacity-70">{presentation.label}{message.metadata?.fileSize ? ` · ${formatFileSize(message.metadata.fileSize)}` : ''}</span></span>
    <span className="flex gap-1">
      {previewable && <button className="grid h-7 w-7 place-items-center rounded-full hover:bg-text-primary dark:hover:bg-text-primary-dark/[.08]" type="button" onClick={onOpen} aria-label={`Preview ${name}`}><FiEye /></button>}
      {message.mediaUrl && <a className="grid h-7 w-7 place-items-center rounded-full hover:bg-text-primary dark:hover:bg-text-primary-dark/[.08]" href={message.mediaUrl} download={name} aria-label={`Download ${name}`} onClick={(event) => event.stopPropagation()}><FiDownload /></a>}
    </span>
  </div>;
}

export default memo(FileMessage);
