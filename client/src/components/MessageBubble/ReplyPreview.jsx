import { memo } from "react";
import { FiFile, FiImage, FiMic, FiVideo } from "react-icons/fi";
import { getReplyMediaType, getReplySummary } from "./utils/messageHelpers";

const ICONS = {
  image: FiImage,
  video: FiVideo,
  gif: FiImage,
  audio: FiMic,
  voice: FiMic,
  file: FiFile,
  document: FiFile,
};

function ReplyPreview({ reply, isOwn }) {
  if (!reply) return null;
  const mediaType = getReplyMediaType(reply);
  const Icon = ICONS[mediaType];
  const sender = reply.sender?.username || "Reply";
  return (
    <div className={`mb-2 flex w-full overflow-hidden rounded-lg text-left ${isOwn ? "bg-white/[.15]" : "bg-[#f3f4f6]"}`}>
      <span className={`w-1 shrink-0 ${isOwn ? "bg-white/[.8]" : "bg-primary/[.95] dark:bg-primary-dark/[.95]"}`} aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 px-3 py-2">
        <strong className="truncate text-xs font-bold">{sender}</strong>
        <span className="flex truncate items-center gap-[5px] text-xs opacity-80">
          {Icon && <Icon className="h-[13px] w-[13px] shrink-0" aria-hidden="true" />}
          <span>{getReplySummary(reply)}</span>
        </span>
      </div>
    </div>
  );
}

export default memo(ReplyPreview);
