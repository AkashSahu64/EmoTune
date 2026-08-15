import { memo } from "react";
import { FiShield, FiLock, FiEye } from "react-icons/fi";

const badges = [
  { icon: FiShield, label: "End-to-End Encrypted", color: "var(--theme-success)" },
  { icon: FiLock, label: "Secure Authentication", color: "var(--theme-primary)" },
  { icon: FiEye, label: "Privacy First", color: "var(--color-ai)" },
];

export default memo(function TrustBadges() {
  return (
    <div className="flex flex-row items-start justify-center gap-5">
      {badges.map((b) => (
        <span
          key={b.label}
          className="flex items-center gap-2 text-[11px] sm:text-[10px] text-text-secondary"
        >
          <b.icon
            size={14}
            className="sm:w-[11px] sm:h-[11px] shrink-0"
            style={{ color: b.color }}
          />

          <span className="font-medium leading-none whitespace-nowrap">
            {b.label}
          </span>
        </span>
      ))}
    </div>
  );
});