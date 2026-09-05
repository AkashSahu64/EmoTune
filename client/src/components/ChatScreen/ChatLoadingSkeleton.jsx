import { memo } from "react";
import { Skeleton } from "../ui";

const ROWS = [
  { own: false, width: "w-[34%]", lines: 1, avatar: true, tail: false },
  { own: false, width: "w-[48%]", lines: 2, avatar: false, tail: true },
  { own: true, width: "w-[42%]", lines: 1, tail: false, ticks: true },
  { own: true, width: "w-[58%]", lines: 2, tail: true, ticks: true },
  { own: false, width: "w-[52%]", media: true, avatar: true, tail: true },
  { own: false, width: "w-[39%]", lines: 1, avatar: true, tail: true },
  { own: true, width: "w-[62%]", lines: 2, tail: true, ticks: true },
  { own: true, width: "w-[30%]", lines: 1, tail: true, ticks: true },
];

function SkeletonBar({ className = "" }) {
  return <Skeleton className={`bg-text-muted/20 dark:bg-text-muted-dark/20 ${className}`} rounded="full" />;
}

function MessageBubbleSkeleton({ row }) {
  const isMedia = row.media;
  const bubbleTone = row.own
    ? "bg-chat-outgoing dark:bg-chat-outgoing-dark"
    : "bg-chat-incoming dark:bg-chat-incoming-dark";
  const skeletonTone = row.own ? "bg-white/25" : "bg-text-muted/20 dark:bg-text-muted-dark/20";

  return (
    <div
      className={`flex min-w-0 max-w-full items-end gap-1.5 px-2.5 lg:px-1 ${
        row.own ? "justify-end" : "justify-start"
      } ${row.grouped ? "mb-0.5" : "mb-1"}`}
      aria-hidden="true"
    >
      {!row.own && (
        <div className="mr-2 hidden h-8 w-8 shrink-0 self-end sm:block">
          {row.avatar && !row.grouped && <Skeleton className="h-8 w-8" rounded="full" />}
        </div>
      )}

      <div className={`relative flex min-w-0 w-fit max-w-[calc(100vw-16px)] sm:max-w-[70%] flex-col ${row.own ? "items-end" : "items-start"}`}>
        <div
          className={`relative min-w-0 max-w-full overflow-visible rounded-lg px-1 py-[5px] text-[14px] leading-5 shadow-none ${bubbleTone} ${row.tail ? (row.own ? "rounded-br-sm" : "rounded-bl-sm") : ""}`}
        >
          {row.tail && (
            <svg
              className={`absolute bottom-0 ${row.own ? "right-[-7px]" : "left-[-7px] scale-x-[-1]"}`}
              width="10"
              height="16"
              viewBox="0 0 12 18"
              preserveAspectRatio="none"
            >
              <path
                d="M0 0C5 2 1 12 12 18H0V0Z"
                className={row.own ? "fill-chat-outgoing dark:fill-chat-outgoing-dark" : "fill-chat-incoming dark:fill-chat-incoming-dark"}
              />
            </svg>
          )}

          {isMedia ? (
            <div className="w-[min(280px,calc(100vw-64px))] space-y-2">
              <Skeleton className="h-[132px] w-full rounded-xl bg-text-muted/15 dark:bg-text-muted-dark/15" />
              <div className="flex items-center justify-between gap-2 px-1">
                <SkeletonBar className={`h-2 w-[46%] ${skeletonTone}`} />
                <div className="flex items-center gap-1">
                  <SkeletonBar className={`h-2 w-8 ${skeletonTone}`} />
                  <SkeletonBar className={`h-2 w-3 ${skeletonTone}`} />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <SkeletonBar className={`h-2.5 ${row.lines === 1 ? "w-[76px]" : "w-[148px]"} ${skeletonTone}`} />
              {row.lines > 1 && <SkeletonBar className={`h-2.5 w-[112px] ${skeletonTone}`} />}
              <div className="flex items-center justify-end gap-1 pt-0.5">
                <SkeletonBar className={`h-2 w-8 ${skeletonTone}`} />
                {row.ticks && <SkeletonBar className={`h-2 w-4 ${skeletonTone}`} />}
              </div>
            </div>
          )}
        </div>
      </div>

      {row.own && (
        <div className="ml-2 hidden h-8 w-8 shrink-0 self-end sm:block">
          {row.tail && <Skeleton className="h-8 w-8" rounded="full" />}
        </div>
      )}
    </div>
  );
}

function ChatLoadingSkeleton() {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-chat-background dark:bg-chat-background-dark py-2 scrollbar-glass"
      role="status"
      aria-busy="true"
      aria-label="Loading conversation"
    >
      <div className="flex justify-center py-3" aria-hidden="true">
        <span className="rounded-full bg-surface-elevated/80 dark:bg-surface-elevated-dark/80 px-3 py-1 text-[11px] font-semibold text-text-muted dark:text-text-muted-dark shadow-sm">
          <span className="inline-block h-2 w-12 animate-pulse rounded-full bg-text-muted/25 dark:bg-text-muted-dark/25" />
        </span>
      </div>
      <div className="space-y-0.5" aria-hidden="true">
        {ROWS.map((row, index) => (
          <MessageBubbleSkeleton
            key={`${row.own ? "out" : "in"}-${index}`}
            row={{ ...row, grouped: index > 0 && ROWS[index - 1].own === row.own }}
          />
        ))}
      </div>
    </div>
  );
}

export default memo(ChatLoadingSkeleton);
