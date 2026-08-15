import {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  FiAlertTriangle,
  FiCopy,
  FiCornerUpLeft,
  FiEdit2,
  FiInfo,
  FiMapPin,
  FiShare2,
  FiTrash2,
} from "react-icons/fi";

function BubbleMenu({
  id,
  message,
  isOwn,
  isPinned,
  onClose,
  onReply,
  onForward,
  onEdit,
  onPin,
  onUnpin,
  onDeleteForMe,
  onDeleteForEveryone,
  onShowInfo,
  anchorRef,
}) {
  const [position, setPosition] = useState(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const itemRefs = useRef([]);
  const items = useMemo(
    () => [
      {
        icon: FiCornerUpLeft,
        label: "Reply",
        action: () => onReply?.(message),
      },
      { icon: FiShare2, label: "Forward", action: () => onForward?.(message) },
      {
        icon: FiCopy,
        label: "Copy",
        action: async () => {
          const content =
            message.content ||
            message.metadata?.emoji ||
            message.metadata?.fileName ||
            message.mediaUrl;
          if (!content) {
            toast.error("Nothing to copy");
            return;
          }
          try {
            await navigator.clipboard.writeText(String(content));
            toast.success("Message copied");
          } catch {
            toast.error("Clipboard access was unavailable");
          }
        },
      },
      ...(isOwn
        ? [{ icon: FiEdit2, label: "Edit", action: () => onEdit?.(message) }]
        : []),
      {
        icon: FiMapPin,
        label: isPinned ? "Unpin" : "Pin",
        action: () => (isPinned ? onUnpin?.(message) : onPin?.(message)),
      },
      { divider: true },
      {
        icon: FiAlertTriangle,
        label: "Delete for me",
        action: () => onDeleteForMe?.(message),
        danger: true,
      },
      ...(isOwn
        ? [
            {
              icon: FiTrash2,
              label: "Delete for everyone",
              action: () => onDeleteForEveryone?.(message),
              danger: true,
            },
          ]
        : []),
      { divider: true },
      {
        icon: FiInfo,
        label: "Message info",
        action: () => onShowInfo?.(message),
      },
    ],
    [
      message,
      isOwn,
      isPinned,
      onReply,
      onForward,
      onEdit,
      onPin,
      onUnpin,
      onDeleteForMe,
      onDeleteForEveryone,
      onShowInfo,
    ],
  );

  useLayoutEffect(() => {
    const update = () => {
      const rect = anchorRef?.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(240, window.innerWidth - 16);
      const height = Math.min(
        420,
        Math.max(220, items.filter((item) => !item.divider).length * 38),
      );
      const left = isOwn
        ? Math.min(
            Math.max(8, rect.right - width),
            window.innerWidth - width - 8,
          )
        : Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
      const top =
        rect.bottom + height + 8 > window.innerHeight - 72
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
  const actionableItems = items.filter((item) => !item.divider);
  useEffect(() => {
    itemRefs.current[focusedIndex]?.focus();
  }, [focusedIndex]);
  if (!position) return null;

  return createPortal(
    <div
      id={id}
      className="fixed z-50 max-w-[calc(100vw-16px)] min-w-[190px] overflow-hidden rounded-xl border border-border/[.55] bg-surface-elevated text-text-primary shadow-[0_18px_40px_rgb(3_7_18_/_0.28)]"
      style={position}
      role="menu"
      aria-label="Message menu"
      data-bubble-popup="true"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setFocusedIndex((value) => (value + 1) % actionableItems.length);
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          setFocusedIndex(
            (value) =>
              (value - 1 + actionableItems.length) % actionableItems.length,
          );
        }
        if (event.key === "Home") {
          event.preventDefault();
          setFocusedIndex(0);
        }
        if (event.key === "End") {
          event.preventDefault();
          setFocusedIndex(actionableItems.length - 1);
        }
        if (event.key === "Escape") {
          event.preventDefault();
          onClose?.();
        }
      }}
    >
      {items.map((item, index) =>
        item.divider ? (
          <div className="my-[3px] h-px bg-border/[.45]" key={`divider-${index}`} />
        ) : (
          <button
            ref={(node) => {
              if (!item.divider)
                itemRefs.current[actionableItems.indexOf(item)] = node;
            }}
            key={item.label}
            type="button"
            role="menuitem"
            data-bubble-action="true"
            className={`flex w-full items-center gap-[9px] px-3 py-[9px] text-left text-[13px] hover:bg-text-primary/[.07] focus-visible:bg-text-primary/[.07] focus-visible:outline-none ${item.danger ? "text-danger" : ""}`}
            onClick={(event) => {
              event.stopPropagation();
              Promise.resolve(item.action?.()).finally(() => onClose?.());
            }}
          >
            <item.icon className="h-[15px] w-[15px] shrink-0" aria-hidden="true" />
            <span>{item.label}</span>
          </button>
        ),
      )}
    </div>,
    document.body,
  );
}

export default memo(BubbleMenu);
