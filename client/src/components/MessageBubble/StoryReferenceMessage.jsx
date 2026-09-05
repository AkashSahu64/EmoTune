import { memo } from "react";

function StoryReferenceMessage({ message, onOpenStory }) {
  const story = message?.storyRef && typeof message.storyRef === "object"
    ? message.storyRef
    : null;
  const content = story?.content || {};
  const mediaUrl = content.mediaUrl || content.images?.[0]?.url || content.gifUrl;
  const title = story?.type === "text" ? (content.text || "Text Story") : "Story";
  const isReaction = Boolean(message?.metadata?.storyReaction);
  const subtitle = isReaction
    ? `Reacted ${message.content || message.metadata?.emoji || "❤️"} to this Story`
    : message?.type === "story_reply" ? "Replying to this Story" : "Shared Story";
  const unavailable = !story || Boolean(story.deletedAt) || (story.expiresAt && new Date(story.expiresAt) <= new Date());

  return (
    <>
      <button
        type="button"
        disabled={unavailable}
        onClick={() => !unavailable && onOpenStory?.(story)}
        className="mb-1 flex max-w-[280px] items-center gap-2 rounded-lg border border-black/10 bg-black/5 p-2 text-left transition-colors hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15 disabled:cursor-default"
        aria-label={unavailable ? "Story unavailable" : "Open Story"}
      >
      {unavailable ? (
        <div className="grid h-12 w-10 shrink-0 place-items-center rounded-md bg-slate-200 text-[10px] text-slate-500 dark:bg-slate-700 dark:text-slate-300">
          Story
        </div>
      ) : mediaUrl ? (
        <img className="h-12 w-10 shrink-0 rounded-md object-cover" src={mediaUrl} alt="Story preview" loading="lazy" />
      ) : (
        <div
          className="grid h-12 w-10 shrink-0 place-items-center rounded-md px-1 text-center text-[9px] font-semibold text-white"
          style={{ backgroundColor: content.backgroundColor || "#3B5BFF" }}
        >
          {title}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[11px] font-semibold">{unavailable ? "Story unavailable" : subtitle}</p>
        {!unavailable && (
          <p className="truncate text-[11px] opacity-70">{content.caption || content.text || title}</p>
        )}
      </div>
      </button>
      {message?.type === "story_reply" && !isReaction && message.content && (
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
      )}
    </>
  );
}

export default memo(StoryReferenceMessage);
