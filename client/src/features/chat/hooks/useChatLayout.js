import { useCallback, useState } from 'react';

export default function useChatLayout() {
  const [showSidebar, setShowSidebar] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(false);

  const toggleSidebar = useCallback(() => setShowSidebar((value) => !value), []);
  const toggleRightPanel = useCallback(() => setShowRightPanel((value) => !value), []);

  return {
    showSidebar,
    setShowSidebar,
    showRightPanel,
    setShowRightPanel,
    toggleSidebar,
    toggleRightPanel,
  };
}
