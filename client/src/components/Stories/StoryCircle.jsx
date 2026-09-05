import { memo } from "react";
import { FaPlus } from "react-icons/fa6";

const typeBadges = {
  memory: "\u{1F570}\u{FE0F}",
  music: "\u{1F3B5}",
  voice: "\u{1F3A4}",
  ai_generated: "\u{2728}",
  multi_image: "\u{1F4F8}",
};

function StoryCircle({
  src,
  name,
  viewed,
  isOwn,
  hasStory,
  onClick,
  onAdd,
  type,
  size = "md",
}) {
  const sizeClasses = size === "sm" ? "size-12 text-meta" : "size-14 text-lg";
  const containerWidth = size === "sm" ? "w-[60px]" : "w-[72px]";
  return (
    <div
      className={`flex shrink-0 flex-col items-center gap-1 rounded-lg py-1 ${containerWidth}`}
    >
      <div
        className={`relative rounded-full border-[2.5px] p-[2px] ${hasStory ? (viewed ? "border-border/70 dark:border-border-dark/70" : "border-primary dark:border-primary-dark") : "border-border/50 dark:border-border-dark/50"}`}
      >
        <button
          onClick={onClick}
          className="interactive block rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 dark:focus-visible:ring-focus-dark/50"
          type="button"
          aria-label={isOwn ? "Open your Story" : `Open ${name || "Story"}`}
        >
          <div
            className={`${sizeClasses} overflow-hidden rounded-full border-2 border-background dark:border-background-dark`}
          >
            {src ? (
              <img
                src={src}
                alt={name || "Story"}
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center bg-primary dark:bg-primary-dark font-bold text-on-primary dark:text-on-primary-dark">
                {name?.[0]?.toUpperCase() || "?"}
              </div>
            )}
          </div>
          {type && typeBadges[type] && (
            <div className="absolute -bottom-0.5 -left-0.5 flex size-4 items-center justify-center text-meta">
              {typeBadges[type]}
            </div>
          )}
        </button>
        {isOwn && onAdd && (
          <button
            type="button"
            onClick={onAdd}
            aria-label="Add to your Story"
            className="absolute -bottom-0.5 -right-0.5 flex size-6 items-center justify-center rounded-full border-1 border-background bg-primary text-on-primary shadow-soft dark:border-background-dark dark:bg-primary-dark dark:text-on-primary-dark"
          >
            <FaPlus size={16}/>
          </button>
        )}
      </div>
      <span
        className={`w-full truncate text-center text-meta font-medium ${hasStory ? "text-text-primary dark:text-text-primary-dark" : "text-text-secondary dark:text-text-secondary-dark"}`}
      >
        {isOwn ? "Your Story" : name || "Unknown"}
      </span>
    </div>
  );
}

export default memo(StoryCircle);
