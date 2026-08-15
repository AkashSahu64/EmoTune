import { memo } from "react";
import { FiMapPin } from "react-icons/fi";

function BubbleContainer({
  children,
  isOwn,
  isFirstInGroup,
  isLastInGroup,
  isGrouped,
  variant,
  isPinned,
  showAvatar,
  avatar,
  senderName,
  onMouseEnter,
  onMouseLeave,
  onPointerDown,
  containerRef,
  actions,
  menu,
  picker,
  reactions,
}) {
  const initials = senderName?.trim()?.charAt(0)?.toUpperCase() || "?";
  const isMedia = variant === "media";
  const isChromeless = variant === "chromeless";
  const bubbleBase = isChromeless
    ? "bg-transparent p-0 shadow-none"
    : [
        "relative min-w-0 max-w-full overflow-visible px-1 py-[5px] text-[14px] leading-5",
        isMedia ? "w-full p-1" : "",
        isOwn
          ? "bg-[var(--wa-outgoing)] text-[var(--wa-outgoing-text)]"
          : "bg-[var(--wa-incoming)] text-[var(--wa-incoming-text)]",
      ]
        .filter(Boolean)
        .join(" ");

  return (
    <article
      className={`group relative z-0 flex min-w-0 max-w-full items-end px-2.5 lg:px-2 hover:z-50 ${isOwn ? "justify-end" : "justify-start"} ${isGrouped ? "mb-0.5" : "mb-1"}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onPointerDown={onPointerDown}
      aria-label={`Message from ${senderName}${isOwn ? " (you)" : ""}`}
    >
      {!isOwn && (
        <div className="mr-2 hidden h-8 w-8 shrink-0 self-end sm:block">
          {showAvatar && isLastInGroup &&
            (avatar ? (
              <img
                className="h-8 w-8 rounded-full object-cover shadow-sm"
                src={avatar}
                alt=""
                loading="lazy"
              />
            ) : (
              <span
                className="grid h-8 w-8 place-items-center rounded-full bg-slate-600 text-[11px] font-bold text-white"
                aria-hidden="true"
              >
                {initials}
              </span>
            ))}
        </div>
      )}
      <div
        className={`relative z-20 isolate flex min-w-0 flex-col ${isOwn ? "items-end" : "items-start"} ${isMedia ? "w-fit max-w-[min(360px,calc(100vw-16px))]" : "w-fit max-w-[calc(100vw-16px)] sm:max-w-[70%]"}`}
        ref={containerRef}
      >
        {isPinned && (
          <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-400/15 dark:text-amber-200">
            <FiMapPin aria-hidden="true" />
            <span>Pinned</span>
          </div>
        )}
        <div
          className={`${bubbleBase} isolate shadow-none ${!isChromeless ? (isOwn ? (isLastInGroup ? "rounded-md rounded-br-xs" : "rounded-md") : isLastInGroup ? "rounded-md rounded-bl-xs" : "rounded-md") : ""}`}
        >
          {isOwn && isLastInGroup && !isChromeless && (
            <svg aria-hidden="true" className="absolute bottom-0 right-[-7px]" width="10" height="16" viewBox="0 0 12 18" preserveAspectRatio="none">
              <path d="M0 0C5 2 1 12 12 18H0V0Z" fill="var(--wa-outgoing)" />
            </svg>
          )}
          {!isOwn && isLastInGroup && !isChromeless && (
            <svg aria-hidden="true" className="absolute bottom-0 left-[-7px] scale-x-[-1]" width="10" height="16" viewBox="0 0 12 18" preserveAspectRatio="none">
              <path d="M0 0C5 2 1 12 12 18H0V0Z" fill="var(--wa-incoming)" />
            </svg>
          )}
          {children}
        </div>
        {actions}
        {picker}
        {menu}
        {reactions}
      </div>
      {isOwn && (
        <div className="ml-2 hidden h-8 w-8 shrink-0 self-end sm:block">
          {showAvatar && isLastInGroup &&
            (avatar ? (
              <img
                className="h-8 w-8 rounded-full object-cover shadow-sm"
                src={avatar}
                alt=""
                loading="lazy"
              />
            ) : (
              <span
                className="grid h-8 w-8 place-items-center rounded-full bg-slate-600 text-[11px] font-bold text-white"
                aria-hidden="true"
              >
                {initials}
              </span>
            ))}
        </div>
      )}
    </article>
  );
}

export default memo(BubbleContainer);
