import { useCallback, useState } from 'react';

export default function useMediaPreview() {
  const [previewMessage, setPreviewMessage] = useState(null);
  const openPreview = useCallback((message) => setPreviewMessage(message), []);
  const closePreview = useCallback(() => setPreviewMessage(null), []);
  return { previewMessage, openPreview, closePreview };
}
