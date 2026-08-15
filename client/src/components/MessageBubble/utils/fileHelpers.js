import { FILE_KIND_STYLES, PREVIEWABLE_DOCUMENTS } from './constants';

export function getFileExtension(name = '') {
  const segment = String(name).split('.').pop();
  return segment && segment !== name ? segment.toUpperCase() : '';
}

export function getFileKind(name = '') {
  const extension = getFileExtension(name).toLowerCase();
  if (extension === 'pdf') return 'pdf';
  if (['doc', 'docx', 'odt', 'rtf'].includes(extension)) return 'word';
  if (['xls', 'xlsx', 'csv', 'ods'].includes(extension)) return 'sheet';
  if (['ppt', 'pptx', 'odp'].includes(extension)) return 'slides';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) return 'archive';
  return 'file';
}

export function getFilePresentation(name = '') {
  const kind = getFileKind(name);
  const extension = getFileExtension(name);
  return { kind, extension, ...FILE_KIND_STYLES[kind] };
}

export function canPreviewDocument(name = '') {
  return PREVIEWABLE_DOCUMENTS.has(getFileExtension(name));
}
