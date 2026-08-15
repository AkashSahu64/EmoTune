import { memo } from "react";
import SenderName from "./SenderName";

function BubbleHeader({ showSender, senderName }) {
  if (!showSender) return null;
  return (
    <header className="px-0.5 pb-1 text-[12.5px] font-bold text-sky-600 dark:text-sky-300">
      <SenderName name={senderName} />
    </header>
  );
}

export default memo(BubbleHeader);
