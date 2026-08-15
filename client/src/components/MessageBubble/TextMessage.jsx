import { memo } from 'react';

function TextMessage({ message, isOwn }) {
  const deleted = message.content === "This message was deleted";
  return <p className={`m-0 min-h-5 whitespace-pre-wrap break-words text-[14px] leading-5 ${isOwn ? "pr-[65px]" : "pr-[45px]"} ${deleted ? "italic opacity-70" : ""}`}>
    {message.content}
    {(message.editedAt || message.edited) && <span className="ml-1 text-[11px] opacity-70">(edited)</span>}
  </p>;
}

export default memo(TextMessage);
