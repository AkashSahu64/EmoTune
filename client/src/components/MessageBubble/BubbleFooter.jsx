import { memo } from "react";
import TruthScoreIndicator from "../TruthScoreIndicator/TruthScoreIndicator";
import MessageTicks from "./MessageTicks";
import { formatMessageTime } from "./utils/formatters";

function BubbleFooter({
  message,
  isOwn,
  userId,
  overlay = false,
  floating = false,
  compact = false,
}) {
  return (
    <footer
      className={[
        `${compact ? "mt-[-8px]" : "mt-1"} flex min-h-[14px] items-center justify-end gap-1 ${compact ? "pl-14" : "px-0.5"} text-[11px] leading-none opacity-70`,
        overlay
          ? "absolute bottom-1.5 right-1.5 rounded-full bg-black/55 px-1.5 py-1 text-white opacity-100"
          : "",
        floating
          ? "absolute bottom-1 right-1 rounded-full bg-black/55 px-1.5 py-1 text-white opacity-100"
          : "",
        isOwn ? "text-white/80" : "text-gray-400",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {message.editedAt && !compact && (
        <span className="text-[9px] italic opacity-45 mr-0.5">edited</span>
      )}
      {message.truthClaimRef && (
        <TruthScoreIndicator claim={message.truthClaimRef} compact />
      )}
      <time className="tabular-nums" dateTime={message.createdAt || undefined}>
        {formatMessageTime(message.createdAt)}
      </time>
      {isOwn && <MessageTicks message={message} userId={userId} />}
    </footer>
  );
}

export default memo(BubbleFooter);
