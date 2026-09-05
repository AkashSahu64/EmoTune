import { memo } from "react";
import { FiShield, FiLock, FiEye } from "react-icons/fi";

const badges = [
  { icon: FiShield, label: "End-to-End Encrypted", color: "#16A34A" },
  { icon: FiLock, label: "Secure Authentication", color: "#3B5BFF" },
  { icon: FiEye, label: "Privacy First", color: "#7C3AED" },
];

export default memo(function TrustBadges() {
  return (
    <div className="flex flex-row items-start justify-center gap-5">
      {badges.map((b) => (
        <span
          key={b.label}
          className="flex items-center gap-2 text-[11px] sm:text-[10px] text-text-secondary dark:text-text-secondary-dark"
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
