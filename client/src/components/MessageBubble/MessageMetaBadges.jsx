import { memo } from "react";
import { FiEyeOff, FiMoon, FiStar, FiZap } from "react-icons/fi";

function MessageMetaBadges({ message }) {
  const badges = [
    (message.metadata?.aiGenerated || message.sender?.isAI) && {
      label: "AI generated",
      icon: FiZap,
    },
    message.personaUsed && { label: message.personaUsed, icon: FiStar },
    (message.silent || message.metadata?.silent) && {
      label: "Silent",
      icon: FiMoon,
    },
    (message.ghost || message.metadata?.ghost) && {
      label: "Ghost",
      icon: FiEyeOff,
    },
    (message.memory || message.metadata?.memory) && {
      label: "Memory",
      icon: FiStar,
    },
  ].filter(Boolean);
  if (!badges.length) return null;
  return (
    <div className="mb-1 flex flex-wrap gap-1 text-[10px] opacity-70">
      {badges.map(({ label, icon: Icon }) => (
        <span className="inline-flex items-center gap-[3px]" key={label}>
          <Icon className="h-[11px] w-[11px]" aria-hidden="true" />
          {label}
        </span>
      ))}
    </div>
  );
}

export default memo(MessageMetaBadges);
