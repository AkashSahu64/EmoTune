import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Picker from "@emoji-mart/react";
import emojiData from "@emoji-mart/data";
import { FiPlus } from "react-icons/fi";
import { REACTIONS } from "./utils/constants";

function ReactionPicker({ id, isOwn, onPick, anchorRef }) {
  const [position, setPosition] = useState(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [fullPickerOpen, setFullPickerOpen] = useState(false);
  const buttonRefs = useRef([]);
  useLayoutEffect(() => {
    const update = () => {
      const rect = anchorRef?.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(280, window.innerWidth - 16);
      const height = 52;
      const left = isOwn
        ? Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8)
        : Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
      const top = rect.bottom + height + 8 > window.innerHeight - 72
        ? Math.max(8, rect.top - height - 8)
        : Math.min(rect.bottom + 8, window.innerHeight - height - 8);
      setPosition({
        top,
        left,
      });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [anchorRef, isOwn]);
  useEffect(() => {
    buttonRefs.current[focusedIndex]?.focus();
  }, [focusedIndex]);
  if (!position) return null;
  return createPortal(
    <div
      id={id}
      className="fixed z-[1001] flex min-h-11 max-w-[calc(100vw-16px)] min-w-max gap-1 rounded-full border border-border/70 bg-surface-elevated p-1 text-text-primary shadow-xl"
      style={position}
      role="dialog"
      aria-label="Choose a reaction"
      data-bubble-popup="true"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          event.preventDefault();
          setFocusedIndex((value) => (value + 1) % REACTIONS.length);
        }
        if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          event.preventDefault();
          setFocusedIndex((value) => (value - 1 + REACTIONS.length) % REACTIONS.length);
        }
        if (event.key === "Home") { event.preventDefault(); setFocusedIndex(0); }
        if (event.key === "End") { event.preventDefault(); setFocusedIndex(REACTIONS.length - 1); }
      }}
    >
      {REACTIONS.map((emoji, index) => (
        <button
          ref={(node) => { buttonRefs.current[index] = node; }}
          key={emoji}
          type="button"
          data-bubble-action="true"
          className="grid h-8 w-8 place-items-center rounded-full text-xl hover:bg-hover/[.1] focus:outline-none focus:ring-2 focus:ring-focus"
          aria-label={`React with ${emoji}`}
          onClick={(event) => {
            event.stopPropagation();
            onPick?.(emoji);
          }}
        >
          {emoji}
        </button>
      ))}
      <button
        type="button"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border/70 text-text-secondary hover:bg-hover/[.1] focus:outline-none focus:ring-2 focus:ring-focus"
        aria-label="More reactions"
        aria-expanded={fullPickerOpen}
        onClick={(event) => {
          event.stopPropagation();
          setFullPickerOpen((open) => !open);
        }}
      >
        <FiPlus aria-hidden="true" />
      </button>
      {fullPickerOpen && createPortal(
        <div
          className="fixed z-[1002] max-w-[calc(100vw-16px)] overflow-hidden rounded-xl border border-border bg-surface-elevated shadow-2xl"
          style={{
            top: position.top,
            left: isOwn ? "auto" : Math.max(8, position.left),
            right: isOwn ? Math.max(8, window.innerWidth - (position.left + 300)) : "auto",
          }}
          role="dialog"
          aria-label="All reactions"
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <Picker
            data={emojiData}
            theme={document.documentElement.classList.contains("dark") ? "dark" : "light"}
            previewPosition="none"
            skinTonePosition="none"
            onEmojiSelect={(emoji) => {
              setFullPickerOpen(false);
              onPick?.(emoji.native);
            }}
          />
        </div>,
        document.body,
      )}
    </div>,
    document.body,
  );
}

export default memo(ReactionPicker);
