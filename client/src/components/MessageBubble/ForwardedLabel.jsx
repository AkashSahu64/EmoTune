import { memo } from "react";
import { FiCornerUpRight } from "react-icons/fi";

function ForwardedLabel({ forwardedFrom }) {
  if (!forwardedFrom) return null;
  return (
    <div className="mb-1 flex items-center gap-1 px-0.5 text-[11px] italic opacity-60">
      <FiCornerUpRight aria-hidden="true" />
      <span>Forwarded</span>
    </div>
  );
}

export default memo(ForwardedLabel);
