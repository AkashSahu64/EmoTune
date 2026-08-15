import { memo, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Picker from "@emoji-mart/react";
import emojiData from "@emoji-mart/data";
import { FiPlus, FiTrash2, FiX } from "react-icons/fi";
import { REACTIONS } from "./utils/constants";
import { getMyReaction, getReactionUserId, normalizeReactions } from "./utils/reactionHelpers";

function ReactionDetails({ message, userId, onReact, onClose, anchorRef, boundaryRef }) {
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [fullPickerOpen, setFullPickerOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const reactions = useMemo(() => normalizeReactions(message?.reactions), [message?.reactions]);
  const myReaction = getMyReaction(reactions, userId);

  useLayoutEffect(() => {
    const updatePosition = () => {
      const rect = anchorRef?.current?.getBoundingClientRect();
      if (!rect) return;
      const boundary = boundaryRef?.current?.getBoundingClientRect() || {
        top: 0,
        left: 0,
        right: window.innerWidth,
        bottom: window.innerHeight,
        width: window.innerWidth,
        height: window.innerHeight,
      };
      const width = Math.min(380, Math.max(180, boundary.width - 24));
      const height = Math.min(560, Math.max(180, boundary.height - 24));
      const left = Math.min(Math.max(boundary.left + 12, rect.left), boundary.right - width - 12);
      const belowTop = rect.bottom + 10;
      const top = belowTop + height <= boundary.bottom - 12
        ? belowTop
        : Math.max(boundary.top + 12, rect.top - height - 10);
      setPosition({ top, left, width });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [anchorRef, boundaryRef]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      if (fullPickerOpen) setFullPickerOpen(false);
      else onClose?.();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [fullPickerOpen, onClose]);

  useEffect(() => {
    if (filter !== "all" && !reactions.some((reaction) => reaction.emoji === filter)) {
      setFilter("all");
    }
  }, [filter, reactions]);

  const visible = filter === "all" ? reactions : reactions.filter((reaction) => reaction.emoji === filter);
  const users = visible.flatMap((reaction) => reaction.users.map((user) => ({ user, emoji: reaction.emoji })));
  const total = reactions.reduce((sum, reaction) => sum + reaction.count, 0);

  const commitReaction = async (emoji) => {
    if (!emoji || busy) return;
    setBusy(true);
    try {
      await onReact?.(emoji);
      setFullPickerOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const pickerTheme = document.documentElement.classList.contains("dark") ? "dark" : "light";

  return createPortal(
    <div
      className="fixed z-[1000] bg-transparent"
      style={position && boundaryRef?.current ? (() => {
        const rect = boundaryRef.current.getBoundingClientRect();
        return { top: rect.top, left: rect.left, width: rect.width, height: rect.height, pointerEvents: "auto" };
      })() : { inset: 0, pointerEvents: position ? "auto" : "none" }}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <section className="fixed flex max-h-[calc(100vh-24px)] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-2xl border border-border bg-surface-elevated text-text-primary shadow-2xl" style={position ? { top: position.top, left: position.left, width: position.width } : { visibility: "hidden" }} role="dialog" aria-modal="true" aria-labelledby="reaction-details-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 id="reaction-details-title" className="m-0 text-base font-semibold">Reactions</h2>
          <button type="button" className="grid h-8 w-8 place-items-center rounded-full text-text-secondary hover:bg-hover/[.08] focus:outline-none focus:ring-2 focus:ring-focus" onClick={onClose} aria-label="Close reactions">
            <FiX aria-hidden="true" />
          </button>
        </header>

        <div className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2" role="tablist" aria-label="Reaction filters">
          <button type="button" role="tab" aria-selected={filter === "all"} className={`shrink-0 rounded-full px-3 py-1 text-xs ${filter === "all" ? "bg-primary/15 font-semibold text-primary" : "text-text-secondary hover:bg-hover/[.08]"}`} onClick={() => setFilter("all")}>All {total}</button>
          {reactions.map((reaction) => (
            <button key={reaction.emoji} type="button" role="tab" aria-selected={filter === reaction.emoji} className={`shrink-0 rounded-full px-3 py-1 text-xs ${filter === reaction.emoji ? "bg-primary/15 font-semibold text-primary" : "text-text-secondary hover:bg-hover/[.08]"}`} onClick={() => setFilter(reaction.emoji)}>
              {reaction.emoji} {reaction.count}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
          {users.length === 0 ? <p className="py-8 text-center text-sm text-text-secondary">No reactions yet</p> : users.map(({ user, emoji }) => {
            const id = getReactionUserId(user);
            const isYou = id === String(userId);
            const name = isYou ? "You" : user?.username || user?.name || "Unknown user";
            const avatar = user?.avatar || user?.profileImage || user?.profile_image;
            return (
              <div className="flex items-center gap-2 border-b border-border/60 py-2 last:border-b-0" key={`${emoji}-${id}`}>
                {avatar ? <img className="h-8 w-8 shrink-0 rounded-full object-cover" src={avatar} alt="" /> : <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary" aria-hidden="true">{name.charAt(0).toUpperCase()}</span>}
                <span className="min-w-0 flex-1 truncate text-sm">{name}</span>
                <span className="text-lg" aria-label={`Reacted with ${emoji}`}>{emoji}</span>
                {isYou && <button type="button" className="grid h-8 w-8 place-items-center rounded-full text-danger hover:bg-danger/10 focus:outline-none focus:ring-2 focus:ring-focus disabled:cursor-not-allowed disabled:opacity-45" disabled={busy} onClick={() => commitReaction(emoji)} aria-label={`Remove your ${emoji} reaction`} title="Remove your reaction"><FiTrash2 aria-hidden="true" /></button>}
              </div>
            );
          })}
        </div>

        <footer className="relative border-t border-border px-4 py-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs text-text-secondary">Your reaction: <strong className="text-text-primary">{myReaction || "None"}</strong></span>
            <button type="button" className="grid h-8 w-8 place-items-center rounded-full border border-border text-text-secondary hover:bg-hover/[.08] focus:outline-none focus:ring-2 focus:ring-focus disabled:cursor-not-allowed disabled:opacity-45" disabled={busy} aria-label="More reactions" aria-expanded={fullPickerOpen} onClick={() => setFullPickerOpen((open) => !open)}><FiPlus aria-hidden="true" /></button>
          </div>
          <div className="flex max-w-full gap-1 overflow-x-auto pb-0.5" aria-label="Quick reactions">
            {REACTIONS.map((emoji) => (
              <button key={emoji} type="button" disabled={busy} className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xl transition-colors focus:outline-none focus:ring-2 focus:ring-focus disabled:cursor-not-allowed disabled:opacity-45 ${emoji === myReaction ? "bg-primary/15" : "hover:bg-hover/[.08]"}`} aria-label={emoji === myReaction ? `Remove ${emoji} reaction` : `React with ${emoji}`} onClick={() => commitReaction(emoji)}>{emoji}</button>
            ))}
          </div>
          {fullPickerOpen && (
            <div className="absolute bottom-full right-3 z-[1001] mb-2 max-w-[calc(100vw-32px)] overflow-hidden rounded-xl border border-border bg-surface-elevated shadow-2xl" role="dialog" aria-label="More reactions" onMouseDown={(event) => event.stopPropagation()}>
              <Picker data={emojiData} theme={pickerTheme} previewPosition="none" searchPosition="top" skinTonePosition="none" onEmojiSelect={(emoji) => commitReaction(emoji.native)} />
            </div>
          )}
        </footer>
      </section>
    </div>,
    document.body,
  );
}

export default memo(ReactionDetails);
