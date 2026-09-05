import { memo } from "react";
import { FiCornerUpLeft, FiMoreHorizontal, FiShare2, FiSmile } from "react-icons/fi";

const ActionButton = memo(function ActionButton({ label, onClick, expanded = false, hasPopup, controls, children }) {
  return (
    <button
      type="button"
      data-bubble-action="true"
      data-bubble-trigger="true"
      className="grid h-[25px] w-[25px] place-items-center rounded-full text-text-secondary dark:text-text-secondary-dark transition-[color,background-color,border-color,opacity] duration-fast ease-premium hover:bg-hover/[.12] dark:hover:bg-hover-dark/[.12] hover:text-text-primary dark:hover:text-text-primary-dark active:bg-hover/[.11] dark:active:bg-hover-dark/[.11] focus-visible:bg-hover/[.12] dark:focus-visible:bg-hover-dark/[.12] focus-visible:text-text-primary dark:focus-visible:text-text-primary-dark focus-visible:outline-none"
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
      className={`absolute z-[100000] flex items-center gap-0.5 rounded-full border border-border/[.72] dark:border-border-dark/[.72] bg-surface-elevated dark:bg-surface-elevated-dark/[.98] p-1 text-text-primary dark:text-text-primary-dark shadow-lg transition-[opacity,visibility] duration-[120ms] ease ${isOwn ? "right-[calc(100%+5px)]" : "left-[calc(100%+5px)]"} top-1/2 -translate-y-1/2 ${visible ? "visible opacity-100" : "invisible opacity-0"}`}
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
