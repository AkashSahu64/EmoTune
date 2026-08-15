import { memo } from "react";
import { FiCornerUpLeft, FiMoreHorizontal, FiShare2, FiSmile } from "react-icons/fi";

const ActionButton = memo(function ActionButton({ label, onClick, expanded = false, hasPopup, controls, children }) {
  return (
    <button
      type="button"
      data-bubble-action="true"
      data-bubble-trigger="true"
      className="grid h-[25px] w-[25px] place-items-center rounded-full text-text-secondary transition-[color,background-color,border-color,opacity] duration-fast ease-[var(--motion-ease)] hover:bg-hover/[.12] hover:text-text-primary active:bg-hover/[.11] focus-visible:bg-hover/[.12] focus-visible:text-text-primary focus-visible:outline-none"
      aria-label={label}
      aria-expanded={expanded}
      aria-haspopup={hasPopup || undefined}
      aria-controls={controls || undefined}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {children}
    </button>
  );
});

function BubbleActions({ isOwn, visible, menuOpen, reactionOpen, menuId, reactionId, onMouseEnter, onReact, onReply, onForward, onMore }) {
  return (
    <div
      className={`absolute z-[100000] flex items-center gap-0.5 rounded-full border border-border/[.72] bg-surface-elevated/[.98] p-1 text-text-primary shadow-[0_10px_24px_rgb(3_7_18_/_0.2)] transition-[opacity,visibility] duration-[120ms] ease ${isOwn ? "right-[calc(100%+5px)]" : "left-[calc(100%+5px)]"} top-1/2 -translate-y-1/2 ${visible ? "visible opacity-100" : "invisible opacity-0"}`}
      role="toolbar"
      aria-label="Message actions"
      onMouseEnter={onMouseEnter}
      onClick={(event) => {
        event.stopPropagation();
      }}
    >
      <ActionButton label="Reaction" onClick={onReact} expanded={reactionOpen} hasPopup="dialog" controls={reactionId}>
        <FiSmile aria-hidden="true" />
      </ActionButton>
      <ActionButton label="Reply" onClick={onReply}>
        <FiCornerUpLeft aria-hidden="true" />
      </ActionButton>
      <ActionButton label="Forward" onClick={onForward}>
        <FiShare2 aria-hidden="true" />
      </ActionButton>
      <ActionButton label="More" onClick={onMore} expanded={menuOpen} hasPopup="menu" controls={menuId}>
        <FiMoreHorizontal aria-hidden="true" />
      </ActionButton>
    </div>
  );
}

export default memo(BubbleActions);
