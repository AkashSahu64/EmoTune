import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import storyService from "../../services/storyService";
import StoryAnalytics from "./StoryAnalytics";
import HighlightAddModal from "./HighlightAddModal";

const STORY_DURATION = 5000;

function formatViewedAgo(value) {
  const timestamp = value ? new Date(value).getTime() : 0;
  if (!timestamp || Number.isNaN(timestamp)) return "Unknown time";
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
const QUICK_EMOJIS = [
  "❤️",
  "😍",
  "😂",
  "😢",
  "🔥",
  "💯",
  "😮",
  "🥺",
  "👏",
  "🎉",
];

const typeLabels = {
  text: "📝 Text",
  image: "📷 Photo",
  video: "🎬 Video",
  voice: "🎤 Voice",
  music: "🎵 Music",
  ai_generated: "✨ AI",
  multi_image: "📸 Multi",
  memory: "🕰️ Memory",
};

function getStoryTypeLabel(story) {
  const interactiveKind = story?.content?.interactive?.kind;
  if (interactiveKind === "poll") return "📊 Poll";
  if (interactiveKind === "question") return "❓ Question";
  return typeLabels[story?.type] || story?.type;
}

function StoryViewer({ stories, initialIndex, onClose, onChanged, user, chats = [], embedded = false }) {
  const [currentUserIndex, setCurrentUserIndex] = useState(initialIndex || 0);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reactEmoji, setReactEmoji] = useState(null);
  const [showViewers, setShowViewers] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showHighlightModal, setShowHighlightModal] = useState(false);
  const [existingReactions, setExistingReactions] = useState({});
  const [showMenu, setShowMenu] = useState(false);
  const timerRef = useRef(null);
  const viewStartRef = useRef(Date.now());
  const viewRegisteredRef = useRef(false);
  const completionReportedRef = useRef(false);
  const progressRef = useRef(0);
  const advanceRef = useRef(false);
  const touchStartRef = useRef(null);
  const swipeRef = useRef(false);
  const visibilityWasPlayingRef = useRef(false);
  const viewerRef = useRef(null);
  const previousFocusRef = useRef(null);
  const viewDurationRef = useRef(0);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [mediaDuration, setMediaDuration] = useState(null);
  const [mediaReady, setMediaReady] = useState(true);
  const [viewerList, setViewerList] = useState([]);
  const [viewerListLoading, setViewerListLoading] = useState(false);
  const [viewerCursor, setViewerCursor] = useState(null);
  const [showReplies, setShowReplies] = useState(false);
  const [storyReplies, setStoryReplies] = useState([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [shareSending, setShareSending] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const [replyFocused, setReplyFocused] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const mediaRef = useRef(null);

  const userGroup = stories[currentUserIndex];
  const currentStory = userGroup?.stories[currentStoryIndex];
  const isOwn = userGroup?.isOwn;
  const isHighlight = userGroup?.isHighlight;
  const userInfo = userGroup?.userInfo || {};

  const content = currentStory?.content || {};
  const contentImages = content.images || [];
  const currentImage = contentImages[mediaIndex];
  const requiresMetadata =
    Boolean(
      content.mediaUrl && /^(video|audio)\//.test(content.mediaType || ""),
    ) || Boolean(content.voiceUrl || content.musicUrl);
  const durationMs = mediaDuration || STORY_DURATION;

  const isPlaybackPaused = paused || showMenu || showViewers || showAnalytics || showHighlightModal || showReplies || showShare || replyFocused || actionPending || Boolean(reactEmoji);

  useEffect(() => {
    setMediaIndex(0);
    setMediaDuration(null);
    setMediaReady(!requiresMetadata);
    setMediaError(false);
    setReplyText("");
    setReplySending(false);
    setShowReplies(false);
    setStoryReplies([]);
    setShowShare(false);
    setShowMenu(false);
    setShowViewers(false);
    setShowAnalytics(false);
    setShowHighlightModal(false);
    setPaused(false);
    progressRef.current = 0;
    viewRegisteredRef.current = false;
    completionReportedRef.current = false;
    advanceRef.current = false;
    viewStartRef.current = Date.now();
  }, [currentStory?._id, requiresMetadata]);

  useEffect(() => {
    previousFocusRef.current = document.activeElement;
    viewerRef.current?.focus();
    return () => previousFocusRef.current?.focus?.();
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) {
        visibilityWasPlayingRef.current = !paused;
        setPaused(true);
      } else if (visibilityWasPlayingRef.current) {
        visibilityWasPlayingRef.current = false;
        setPaused(false);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [paused]);

  useEffect(() => {
    viewStartRef.current = Date.now();
    viewDurationRef.current = 0;
  }, [currentUserIndex, currentStoryIndex]);

  useEffect(() => {
    if (!showViewers || !isOwn || !currentStory?._id) return undefined;
    let cancelled = false;
    setViewerListLoading(true);
    storyService
      .getViewers(currentStory._id)
      .then((result) => {
        if (cancelled) return;
        setViewerList(result.viewers || []);
        setViewerCursor(result.nextCursor || null);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load viewers");
      })
      .finally(() => {
        if (!cancelled) setViewerListLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showViewers, isOwn, currentStory?._id]);

  useEffect(() => {
    if (!showReplies || !isOwn || !currentStory?._id) return undefined;
    let cancelled = false;
    setRepliesLoading(true);
    storyService
      .getReplies(currentStory._id)
      .then((result) => {
        if (!cancelled) setStoryReplies(result.replies || []);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load Story replies");
      })
      .finally(() => {
        if (!cancelled) setRepliesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showReplies, isOwn, currentStory?._id]);

  const loadMoreViewers = useCallback(async () => {
    if (!viewerCursor || viewerListLoading || !currentStory?._id) return;
    setViewerListLoading(true);
    try {
      const result = await storyService.getViewers(
        currentStory._id,
        viewerCursor,
      );
      setViewerList((items) => [...items, ...(result.viewers || [])]);
      setViewerCursor(result.nextCursor || null);
    } catch {
      toast.error("Failed to load more viewers");
    } finally {
      setViewerListLoading(false);
    }
  }, [viewerCursor, viewerListLoading, currentStory?._id]);

  const markViewed = useCallback(
    async (completed = false) => {
      if (!currentStory?._id || isOwn) return;
      if (completed && completionReportedRef.current) return;
      if (!completed && viewRegisteredRef.current) return;
      if (completed) completionReportedRef.current = true;
      else viewRegisteredRef.current = true;
      const elapsed = Date.now() - viewStartRef.current;
      try {
        await storyService.viewStory(currentStory._id, {
          completed,
          duration: Math.round(elapsed),
        });
      } catch {
        if (completed) completionReportedRef.current = false;
        else viewRegisteredRef.current = false;
      }
    },
    [currentStory?._id, isOwn],
  );

  useEffect(() => {
    if (currentStory) markViewed(false);
  }, [currentStory?._id, markViewed]);

  const goNext = useCallback(() => {
    if (advanceRef.current) return;
    advanceRef.current = true;
    if (progressRef.current >= 0.9) markViewed(true);
    const group = stories[currentUserIndex];
    const hasMoreMedia =
      currentStory?.type === "multi_image" &&
      mediaIndex < contentImages.length - 1;
    if (hasMoreMedia) {
      setMediaIndex((index) => index + 1);
      setProgress(0);
      progressRef.current = 0;
      viewStartRef.current = Date.now();
      advanceRef.current = false;
    } else if (currentStoryIndex < group.stories.length - 1) {
      setCurrentStoryIndex((i) => i + 1);
      setProgress(0);
      viewStartRef.current = Date.now();
    } else if (currentUserIndex < stories.length - 1) {
      setCurrentUserIndex((i) => i + 1);
      setCurrentStoryIndex(0);
      setProgress(0);
      viewStartRef.current = Date.now();
    } else {
      onClose();
    }
  }, [
    stories,
    currentUserIndex,
    currentStoryIndex,
    currentStory,
    contentImages.length,
    mediaIndex,
    onClose,
    markViewed,
    mediaDuration,
  ]);

  const goPrev = useCallback(() => {
    if (mediaIndex > 0) {
      setMediaIndex((index) => index - 1);
      setProgress(0);
      progressRef.current = 0;
      viewStartRef.current = Date.now();
    } else if (currentStoryIndex > 0) {
      setCurrentStoryIndex((i) => i - 1);
      setProgress(0);
      viewStartRef.current = Date.now();
    } else if (currentUserIndex > 0) {
      setCurrentUserIndex((i) => i - 1);
      const prevLen = stories[currentUserIndex - 1]?.stories.length || 1;
      setCurrentStoryIndex(prevLen - 1);
      setProgress(0);
      viewStartRef.current = Date.now();
    }
  }, [stories, currentUserIndex, currentStoryIndex, mediaIndex]);

  useEffect(() => {
    if (isPlaybackPaused || !currentStory || !mediaReady) return;
    const startTime = Date.now();
    const startingProgress = progressRef.current;

    const update = () => {
      const elapsedProgress = (Date.now() - startTime) / durationMs;
      const pct = Math.min(startingProgress + elapsedProgress, 1);
      setProgress(pct);
      progressRef.current = pct;
      if (pct >= 1) {
        goNext();
      }
    };
    timerRef.current = setInterval(update, 50);
    return () => clearInterval(timerRef.current);
  }, [
    currentUserIndex,
    currentStoryIndex,
    mediaIndex,
    isPlaybackPaused,
    currentStory,
    mediaReady,
    durationMs,
    goNext,
  ]);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media || !mediaReady) return;
    if (isPlaybackPaused) {
      media.pause();
    } else {
      media.play?.().catch(() => {});
    }
  }, [isPlaybackPaused, mediaReady, currentStory?._id, mediaIndex]);

  const handleClick = (e) => {
    if (swipeRef.current) {
      swipeRef.current = false;
      return;
    }
    if (e.target.closest?.("button, input, textarea, a")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width * 0.3) {
      goPrev();
    } else if (x > rect.width * 0.7) {
      goNext();
    } else {
      setPaused((p) => !p);
    }
  };

  const handleTouchStart = (event) => {
    touchStartRef.current = {
      x: event.changedTouches[0].clientX,
      y: event.changedTouches[0].clientY,
    };
  };

  const handleTouchEnd = (event) => {
    if (!touchStartRef.current) return;
    const dx = event.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = event.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) {
      swipeRef.current = true;
      if (dx < 0) goNext();
      else goPrev();
    } else if (dy > 80 && Math.abs(dy) > Math.abs(dx)) {
      swipeRef.current = true;
      onClose();
    }
  };

  useEffect(() => {
    const nextGroup = stories[currentUserIndex];
    const nextStory =
      nextGroup?.stories?.[currentStoryIndex + 1] ||
      stories[currentUserIndex + 1]?.stories?.[0];
    const nextUrl =
      nextStory?.content?.mediaUrl ||
      nextStory?.content?.gifUrl ||
      nextStory?.content?.images?.[0]?.url;
    if (nextUrl && typeof Image !== "undefined") {
      const image = new Image();
      image.src = nextUrl;
    }
  }, [stories, currentUserIndex, currentStoryIndex]);

  const handleReact = async (emoji) => {
    if (!currentStory?._id || isOwn) return;
    const storyId = currentStory._id;
    const previous = existingReactions[storyId] || null;
    setReactEmoji(emoji);
    setTimeout(() => setReactEmoji(null), 1500);
    setExistingReactions((prev) => ({
      ...prev,
      [storyId]: previous === emoji ? null : emoji,
    }));
    try {
      const result = await storyService.reactToStory(storyId, emoji);
      if (result.result?.action === "remove")
        setExistingReactions((prev) => ({ ...prev, [storyId]: null }));
      if (result.result?.action === "change" || result.result?.action === "add")
        setExistingReactions((prev) => ({ ...prev, [storyId]: emoji }));
    } catch {
      setExistingReactions((prev) => ({ ...prev, [storyId]: previous }));
      toast.error("Failed to update reaction");
    }
  };

  const handleDelete = async () => {
    if (!currentStory?._id || !isOwn) return;
    setActionPending(true);
    try {
      await storyService.deleteStory(currentStory._id);
      toast.success("Story deleted");
      onChanged?.();
      if (!onChanged) goNext();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setActionPending(false);
    }
    setShowMenu(false);
  };

  const handleDeleteHighlight = async () => {
    if (!userGroup?.highlightId || !isOwn || !isHighlight) return;
    setActionPending(true);
    try {
      await storyService.deleteHighlight(userGroup.highlightId);
      toast.success("Highlight deleted");
      onChanged?.();
    } catch {
      toast.error("Failed to delete highlight");
    } finally {
      setActionPending(false);
      setShowMenu(false);
    }
  };

  const handleReply = async (event) => {
    event?.preventDefault?.();
    const content = replyText.trim();
    if (!content || replySending || !currentStory?._id) return;
    setReplySending(true);
    setActionPending(true);
    try {
      await storyService.replyToStory(currentStory._id, content);
      setReplyText("");
      toast.success("Reply sent");
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to send reply");
    } finally {
      setReplySending(false);
      setActionPending(false);
    }
  };

  const handleShare = async (chatId) => {
    if (!chatId || !currentStory?._id || shareSending) return;
    setShareSending(true);
    setActionPending(true);
    try {
      await storyService.shareStory(currentStory._id, chatId);
      toast.success("Story shared");
      setShowShare(false);
    } catch {
      toast.error("Failed to share Story");
    } finally {
      setShareSending(false);
      setActionPending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowRight") goNext();
    if (e.key === "ArrowLeft") goPrev();
    if (e.key === " ") {
      e.preventDefault();
      setPaused((p) => !p);
    }
  };

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const reactions = useMemo(() => {
    const list = currentStory?.metadata?.reactions || [];
    const counts = {};
    for (const r of list) {
      const e = r.emoji || r;
      counts[e] = (counts[e] || 0) + 1;
    }
    return counts;
  }, [currentStory?.metadata?.reactions]);

  const viewers = useMemo(() => {
    return viewerList.length > 0
      ? viewerList
      : (currentStory?.metadata?.viewDetails || []).map((v) => ({
          user: v.user,
          viewedAt: v.viewedAt,
          completed: v.completed,
        }));
  }, [viewerList, currentStory?.metadata?.viewDetails]);

  if (!currentStory) return null;

  const bgColor = content.backgroundColor || "#1a1a2e";
  const hasMedia = content.mediaUrl || content.gifUrl || currentImage?.url;
  const timeAgo = currentStory.createdAt
    ? Math.floor(
        (Date.now() - new Date(currentStory.createdAt).getTime()) / 60000,
      )
    : 0;
  const timeStr =
    timeAgo < 1
      ? "Just now"
      : timeAgo < 60
        ? `${timeAgo}m ago`
        : timeAgo < 1440
          ? `${Math.floor(timeAgo / 60)}h ago`
          : new Date(currentStory.createdAt).toLocaleDateString();

  return (
    <motion.div
      className={`${embedded ? "absolute inset-0 z-20" : "fixed inset-0 z-[100]"} flex items-center justify-center bg-black/95`}
      initial={{}}
      animate={{}}
      exit={{}}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="dialog"
      aria-modal="true"
      aria-label="Story viewer"
      aria-describedby="story-viewer-status"
      tabIndex={-1}
      ref={viewerRef}
    >
      <div id="story-viewer-status" className="sr-only" aria-live="polite">
        Story {currentStoryIndex + 1} of {userGroup?.stories?.length || 1} from{" "}
        {userInfo?.username || "user"}
      </div>
      <div
        className={`relative mx-auto flex flex-col overflow-hidden border border-white/10 bg-black ${embedded ? "h-full w-full max-w-none rounded-none aspect-auto" : "h-[min(92vh,750px)] w-[min(100%,420px)] max-w-[calc(100vw-1rem)] aspect-[9/16] rounded-2xl"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 right-0 z-10 p-2 flex gap-1.5">
          {userGroup?.stories.map((s, i) => (
            <div
              key={s._id || i}
              className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden"
            >
              <div
                className="h-full bg-white rounded-full transition-colors duration-100"
                style={{
                  width:
                    i < currentStoryIndex
                      ? "100%"
                      : i === currentStoryIndex
                        ? `${progress * 100}%`
                        : "0%",
                }}
              />
            </div>
          ))}
        </div>

        <div className="absolute top-3 left-3 right-3 z-10 flex items-center gap-2">
          <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/30 flex-shrink-0">
            {userInfo?.avatar ? (
              <img
                src={userInfo.avatar}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-ai dark:bg-ai-dark flex items-center justify-center text-white text-xs font-bold">
                {userInfo?.username?.[0]?.toUpperCase() || "?"}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-white text-xs font-semibold truncate">
                {userInfo?.username || "Unknown"}
              </p>
              {currentStory.type && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/70">
                  {getStoryTypeLabel(currentStory)}
                </span>
              )}
              {currentStory.aiGenerated?.caption && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-ai dark:bg-ai-dark text-purple-200">
                  ✨ AI
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/50 text-[10px]">{timeStr}</span>
              {content.location?.name && (
                <span className="text-white/50 text-[10px]">
                  📍 {content.location.name}
                </span>
              )}
              {currentStory.expiresAt && (
                <span className="text-white/40 text-[9px]">
                  ⏳{" "}
                  {Math.max(
                    0,
                    Math.floor(
                      (new Date(currentStory.expiresAt) - Date.now()) / 3600000,
                    ),
                  )}
                  h
                </span>
              )}
            </div>
          </div>
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu((p) => !p);
            }}
            className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white/80 hover:text-white"
            type="button"
            aria-label="Menu"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </motion.button>
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white/80 hover:text-white"
            type="button"
            aria-label="Close story"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </motion.button>
        </div>

        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{}}
              animate={{}}
              exit={{}}
              className="absolute top-14 right-3 z-20 bg-background dark:bg-background-dark rounded-xl shadow-floating dark:shadow-floating-dark border border-border dark:border-border-dark overflow-hidden min-w-[140px]"
            >
              {isOwn && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    isHighlight ? handleDeleteHighlight() : handleDelete();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                  type="button"
                >
                  🗑️ {isHighlight ? "Delete Highlight" : "Delete Story"}
                </button>
              )}
              {isOwn && viewers.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowViewers(true);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-text-secondary dark:text-text-secondary-dark hover:bg-hover/[0.07] dark:hover:bg-hover-dark/[0.07] transition-colors"
                  type="button"
                >
                  👁️ Viewers ({viewers.length})
                </button>
              )}
              {isOwn && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowReplies(true);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-text-secondary dark:text-text-secondary-dark hover:bg-hover/[0.07] dark:hover:bg-hover-dark/[0.07] transition-colors"
                  type="button"
                >
                  💬 Replies
                </button>
              )}
              {!isOwn && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowShare(true);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-text-secondary dark:text-text-secondary-dark hover:bg-hover/[0.07] dark:hover:bg-hover-dark/[0.07] transition-colors"
                  type="button"
                >
                  ↗️ Share to chat
                </button>
              )}
              {isOwn && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAnalytics(true);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-text-secondary dark:text-text-secondary-dark hover:bg-hover/[0.07] dark:hover:bg-hover-dark/[0.07] transition-colors"
                  type="button"
                >
                  📊 Analytics
                </button>
              )}
              {isOwn && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowHighlightModal(true);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-text-secondary dark:text-text-secondary-dark hover:bg-hover/[0.07] dark:hover:bg-hover-dark/[0.07] transition-colors"
                  type="button"
                >
                  ⭐ Add to Highlights
                </button>
              )}
              {currentStory.tags?.length > 0 && (
                <div className="px-3 py-2 border-t border-border dark:border-border-dark">
                  <p className="text-[9px] text-text-secondary dark:text-text-secondary-dark mb-1">
                    Tags
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {currentStory.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/60"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 flex items-center justify-center relative min-h-0 overflow-hidden" onClick={handleClick}>
          {content.interactive?.kind ? (
            <InteractiveStory
              story={currentStory}
              interactive={content.interactive}
            />
          ) : mediaError ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-8 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-danger/15 text-danger text-xl">
                !
              </div>
              <p className="text-sm font-semibold text-white">
                Media unavailable
              </p>
              <p className="text-xs text-white/60">
                This Story media could not be loaded.
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMediaError(false);
                  setMediaReady(false);
                }}
                className="rounded-full border border-white/20 px-4 py-2 text-xs text-white hover:bg-white/10"
              >
                Retry
              </button>
            </div>
          ) : hasMedia ? (
            contentImages.length > 0 && currentImage?.url ? (
              <img
                src={currentImage.url}
                alt={currentImage.caption || `Story image ${mediaIndex + 1}`}
                className="w-full h-full object-contain"
                onLoad={() => setMediaReady(true)}
                onError={() => {
                  setMediaError(true);
                  setMediaReady(true);
                }}
              />
            ) : content.mediaType?.startsWith("video/") ? (
              <video
                ref={mediaRef}
                src={content.mediaUrl}
                className="w-full h-full object-contain"
                autoPlay
                playsInline
                onLoadedMetadata={(event) => {
                  setMediaDuration(
                    Math.max(1000, event.currentTarget.duration * 1000),
                  );
                  setMediaReady(true);
                }}
                onEnded={() => {
                  progressRef.current = 1;
                  goNext();
                }}
                onError={() => {
                  setMediaError(true);
                  setMediaReady(true);
                }}
              />
            ) : (
              <img
                src={content.mediaUrl || content.gifUrl}
                alt={content.caption || "Story media"}
                className="w-full h-full object-contain"
                onLoad={() => setMediaReady(true)}
                onError={() => setMediaError(true)}
                style={
                  content.filterName
                    ? { filter: "brightness(1.05) contrast(1.1)" }
                    : {}
                }
              />
            )
          ) : content.text ? (
            <div
              className="w-full h-full flex items-center justify-center p-8"
              style={{ backgroundColor: bgColor }}
            >
              <p
                className="text-white text-center whitespace-pre-wrap break-words leading-relaxed"
                style={{
                  fontSize: content.fontSize || "24px",
                  fontFamily: content.font || content.fontFamily || "inherit",
                }}
              >
                {content.text}
              </p>
            </div>
          ) : content.musicUrl ? (
            <div
              className="w-full h-full flex flex-col items-center justify-center gap-4 p-8"
              style={{ backgroundColor: bgColor }}
            >
              <div
                className="w-20 h-20 rounded-full bg-ai dark:bg-ai-dark flex items-center justify-center animate-spin"
                style={{ animationDuration: "3s" }}
              >
                <svg width="30" height="30" viewBox="0 0 24 24" fill="white">
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
              </div>
              <p className="text-white text-lg font-semibold">
                {content.musicTitle || "Music"}
              </p>
              {content.musicUrl && (
                <audio
                  ref={mediaRef}
                  src={content.musicUrl}
                  controls
                  className="w-full max-w-[250px] opacity-70"
                  autoPlay
                  onLoadedMetadata={(event) => {
                    setMediaDuration(
                      Math.max(1000, event.currentTarget.duration * 1000),
                    );
                    setMediaReady(true);
                  }}
                  onError={() => toast.error("Unable to play this audio")}
                />
              )}
            </div>
          ) : content.voiceUrl ? (
            <div
              className="w-full h-full flex flex-col items-center justify-center gap-4 p-8"
              style={{ backgroundColor: bgColor }}
            >
              <div className="w-20 h-20 rounded-full bg-success dark:bg-success-dark flex items-center justify-center">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="white">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </div>
              <p className="text-white/60 text-sm">
                Voice Note{" "}
                {content.voiceDuration ? `(${content.voiceDuration}s)` : ""}
              </p>
              {content.voiceUrl && (
                <audio
                  ref={mediaRef}
                  src={content.voiceUrl}
                  controls
                  className="w-full max-w-[250px] opacity-70"
                  autoPlay
                  onLoadedMetadata={(event) => {
                    setMediaDuration(
                      Math.max(1000, event.currentTarget.duration * 1000),
                    );
                    setMediaReady(true);
                  }}
                  onError={() => toast.error("Unable to play this voice Story")}
                />
              )}
            </div>
          ) : content.stickers?.length ? (
            <div
              className="h-full w-full"
              style={{ backgroundColor: bgColor }}
              aria-label="Story sticker"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ backgroundColor: bgColor }}
            >
              <p className="text-white/50 text-sm">No content</p>
            </div>
          )}

          {content.stickers?.map((st, i) => (
            <div
              key={i}
              className="absolute pointer-events-none"
              style={{
                left: `${st.position?.x || 50}%`,
                top: `${st.position?.y || 50}%`,
                transform: `translate(-50%,-50%) rotate(${st.rotation || 0}deg)`,
                width: `${st.size || 60}px`,
                height: `${st.size || 60}px`,
              }}
            >
              {st.mediaType?.startsWith("video/") ? (
                <video
                  ref={mediaRef}
                  src={st.url}
                  className="w-full h-full object-contain"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              ) : (
                <img
                  src={st.url}
                  alt=""
                  className="w-full h-full object-contain"
                />
              )}
            </div>
          ))}
          {content.emojis?.map((em, i) => (
            <span
              key={i}
              className="absolute pointer-events-none"
              style={{
                left: `${em.position?.x || 50}%`,
                top: `${em.position?.y || 50}%`,
                transform: "translate(-50%,-50%)",
                fontSize: `${em.size || 32}px`,
              }}
            >
              {em.emoji}
            </span>
          ))}

          {!mediaReady && !mediaError && hasMedia && (
            <div
              className="absolute inset-0 flex items-center justify-center bg-black/20"
              aria-live="polite"
            >
              <div
                className="size-8 animate-spin rounded-full border-2 border-white/30 border-t-white"
                aria-label="Loading Story media"
              />
            </div>
          )}

          {paused && !mediaError && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                className="flex size-12 items-center justify-center rounded-full bg-black/50 text-white"
                aria-hidden="true"
              >
                ▶
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          aria-label="Previous Story"
          className="absolute left-2 top-1/2 z-10 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white/80 hover:bg-black/50 hover:text-white sm:flex"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          aria-label="Next Story"
          className="absolute right-2 top-1/2 z-10 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white/80 hover:bg-black/50 hover:text-white sm:flex"
        >
          ›
        </button>

        <div className="absolute bottom-20 left-4 right-4 z-10">
          {content.caption && (
            <p className="text-white/70 text-xs text-center mb-2 line-clamp-2">
              {content.caption}
            </p>
          )}
          {currentStory.tags?.length > 0 && (
            <div className="flex justify-center gap-1.5 mb-2">
              {currentStory.tags.slice(0, 3).map((t) => (
                <span
                  key={t}
                  className="text-[9px] px-2 py-0.5 rounded-full bg-white/10 text-white/60"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 flex-1 overflow-x-auto scrollbar-hide">
              {QUICK_EMOJIS.map((emoji) => (
                <motion.button
                  key={emoji}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReact(emoji);
                  }}
                  className={`flex-shrink-0 rounded-full text-lg transition-colors ${reactEmoji === emoji ? "bg-selection/20 dark:bg-selection-dark/20 ring-2 ring-primary/40 dark:ring-primary-dark/40" : ""}`}
                  type="button"
                  aria-label={`React ${emoji}`}
                >
                  {emoji}
                </motion.button>
              ))}
            </div>
            {isOwn && (
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowViewers((p) => !p);
                }}
                className="text-white/50 text-[10px] flex items-center gap-1 flex-shrink-0"
                type="button"
              >
                👁️ {currentStory?.metadata?.viewCount || 0}
              </motion.button>
            )}
          </div>

          {Object.keys(reactions).length > 0 && (
            <div className="flex items-center gap-1.5">
              {Object.entries(reactions)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([emoji, count]) => (
                  <span
                    key={emoji}
                    className="text-sm flex items-center gap-0.5 bg-white/10 rounded-full px-2 py-0.5"
                  >
                    {emoji}{" "}
                    <span className="text-[9px] text-white/60">{count}</span>
                  </span>
                ))}
            </div>
          )}

          <div className="flex gap-2">
            {!isOwn && (
              <form
                className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-2 py-1 focus-within:border-white/50"
                onSubmit={handleReply}
              >
                <input
                  aria-label="Reply to Story"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value.slice(0, 2000))}
                  onFocus={() => setReplyFocused(true)}
                  onBlur={() => setReplyFocused(false)}
                  maxLength={2000}
                  placeholder="Reply to Story..."
                  className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-xs text-white outline-none placeholder:text-white/50"
                  disabled={replySending}
                />
                <button
                  type="submit"
                  aria-label="Send Story reply"
                  disabled={!replyText.trim() || replySending}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary disabled:opacity-40"
                >
                  {replySending ? "…" : "➤"}
                </button>
              </form>
            )}
          </div>
        </div>

        <AnimatePresence>
          {reactEmoji && (
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl pointer-events-none z-20"
              initial={{}}
              animate={{}}
              exit={{}}
              key={reactEmoji}
            >
              {reactEmoji}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showAnalytics && isOwn && (
            <StoryAnalytics
              storyId={currentStory._id}
              onClose={() => setShowAnalytics(false)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showHighlightModal && isOwn && (
            <HighlightAddModal
              storyId={currentStory._id}
              onClose={() => setShowHighlightModal(false)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showViewers && isOwn && (
            <motion.div
              initial={{}}
              animate={{}}
              exit={{}}
              className="absolute bottom-0 left-0 right-0 z-20 bg-background dark:bg-background-dark rounded-t-2xl border-t border-border dark:border-border-dark max-h-[40%] overflow-y-auto p-4 lg:fixed lg:bottom-4 lg:left-[calc(50%+226px)] lg:right-auto lg:w-[min(360px,calc(50vw-226px))] lg:max-h-[calc(100vh-2rem)] lg:rounded-2xl lg:border lg:shadow-floating"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
                  Viewers ({viewers.length})
                </h3>
                <button
                  onClick={() => setShowViewers(false)}
                  className="text-text-secondary dark:text-text-secondary-dark"
                  type="button"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-2">
                {viewers.map((v, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-xs text-text-secondary dark:text-text-secondary-dark"
                  >
                    <span className="w-6 h-6 rounded-full bg-ai dark:bg-ai-dark flex items-center justify-center text-white text-[8px] font-bold">
                      {v.user?.username?.[0]?.toUpperCase() ||
                        v.user?.toString().slice(-2) ||
                        "?"}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate">
                        {v.user?.username ||
                          v.user?.toString().slice(-6) ||
                          "Unknown"}
                      </p>
                      <p className="text-[10px] opacity-70">
                        Viewed {formatViewedAgo(v.startedAt || v.viewedAt || v.createdAt)}
                      </p>
                    </div>
                    <span className="ml-auto shrink-0" title={`Watched for ${Math.round((v.duration || 0) / 1000)}s`}>
                      {v.completed ? "✅" : "🔄"} {Math.round((v.duration || 0) / 1000)}s
                    </span>
                  </div>
                ))}
                {viewerListLoading && (
                  <p className="text-[10px] text-text-secondary dark:text-text-secondary-dark py-2">
                    Loading viewers…
                  </p>
                )}
                {viewerCursor && !viewerListLoading && (
                  <button
                    type="button"
                    onClick={loadMoreViewers}
                    className="text-[10px] text-primary dark:text-primary-dark py-2"
                  >
                    Load more
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showReplies && isOwn && (
            <motion.div
              initial={{}}
              animate={{}}
              exit={{}}
              className="absolute bottom-0 left-0 right-0 z-20 max-h-[45%] overflow-y-auto rounded-t-2xl border-t border-border bg-background p-4 dark:border-border-dark dark:bg-background-dark lg:fixed lg:bottom-4 lg:left-[calc(50%+226px)] lg:right-auto lg:w-[min(360px,calc(50vw-226px))] lg:max-h-[calc(100vh-2rem)] lg:rounded-2xl lg:border lg:shadow-floating"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
                    Story replies
                  </h3>
                  <p className="text-[10px] text-text-secondary dark:text-text-secondary-dark">
                    {storyReplies.length} replies
                  </p>
                </div>
                <button
                  onClick={() => setShowReplies(false)}
                  className="text-text-secondary dark:text-text-secondary-dark"
                  type="button"
                  aria-label="Close Story replies"
                >
                  ✕
                </button>
              </div>
              {repliesLoading ? (
                <p className="py-4 text-center text-xs text-text-secondary dark:text-text-secondary-dark">
                  Loading replies…
                </p>
              ) : storyReplies.length === 0 ? (
                <p className="py-4 text-center text-xs text-text-secondary dark:text-text-secondary-dark">
                  No replies yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {storyReplies.map((reply) => (
                    <div
                      key={reply._id}
                      className="rounded-xl border border-border bg-surface p-2.5 dark:border-border-dark dark:bg-surface-dark"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-[9px] font-semibold text-on-primary">
                          {reply.sender?.avatar ? (
                            <img
                              src={reply.sender.avatar}
                              alt=""
                              className="size-full object-cover"
                            />
                          ) : (
                            reply.sender?.username?.[0]?.toUpperCase() || "?"
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-text-primary dark:text-text-primary-dark">
                          {reply.sender?.username || "User"}
                        </span>
                        <time className="ml-auto text-[9px] text-text-secondary dark:text-text-secondary-dark">
                          {reply.createdAt
                            ? new Date(reply.createdAt).toLocaleString()
                            : ""}
                        </time>
                      </div>
                      <p className="mt-1.5 break-words text-xs text-text-secondary dark:text-text-secondary-dark">
                        {reply.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showShare && !isOwn && (
            <motion.div
              initial={{}}
              animate={{}}
              exit={{}}
              className="absolute bottom-0 left-0 right-0 z-20 max-h-[55%] overflow-y-auto rounded-t-2xl border-t border-border bg-background p-4 dark:border-border-dark dark:bg-background-dark lg:fixed lg:bottom-4 lg:left-[calc(50%+226px)] lg:right-auto lg:w-[min(360px,calc(50vw-226px))] lg:max-h-[calc(100vh-2rem)] lg:rounded-2xl lg:border lg:shadow-floating"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
                  Share Story to chat
                </h3>
                <button
                  onClick={() => setShowShare(false)}
                  className="text-text-secondary dark:text-text-secondary-dark"
                  type="button"
                  aria-label="Close share dialog"
                >
                  ✕
                </button>
              </div>
              {chats.length === 0 ? (
                <p className="py-4 text-center text-xs text-text-secondary dark:text-text-secondary-dark">
                  No chats available.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {chats.map((chat) => {
                    const other = (chat.participants || [])
                      .map((participant) => participant.user || participant)
                      .find(
                        (participant) =>
                          String(participant?._id) !== String(user?._id),
                      );
                    const label =
                      chat.name || other?.username || "Conversation";
                    return (
                      <button
                        key={chat._id}
                        type="button"
                        disabled={shareSending}
                        onClick={() => handleShare(chat._id)}
                        className="flex w-full items-center gap-2 rounded-xl border border-border bg-surface p-2.5 text-left transition-colors hover:bg-hover/[0.07] disabled:opacity-50 dark:border-border-dark dark:bg-surface-dark dark:hover:bg-hover-dark/[0.07]"
                      >
                        <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-xs font-semibold text-on-primary">
                          {other?.avatar ? (
                            <img
                              src={other.avatar}
                              alt=""
                              className="size-full object-cover"
                            />
                          ) : (
                            label[0]?.toUpperCase()
                          )}
                        </div>
                        <span className="truncate text-xs font-medium text-text-primary dark:text-text-primary-dark">
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function InteractiveStory({ story, interactive }) {
  const [data, setData] = useState(null);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!["poll", "question"].includes(interactive.kind)) return undefined;
    storyService
      .getInteraction(story._id)
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setValue(result.own || "");
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [story._id, interactive.kind]);

  const submit = async () => {
    if (!value || saving) return;
    setSaving(true);
    try {
      await storyService.submitInteraction(story._id, value);
      const result = await storyService.getInteraction(story._id);
      setData(result);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  if (interactive.kind === "link")
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-surface p-8 text-center dark:bg-surface-dark">
        <span className="text-5xl">🔗</span>
        <p className="text-lg font-semibold text-text-primary dark:text-text-primary-dark">
          {interactive.prompt || "Open this link"}
        </p>
        <a
          href={interactive.linkUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-on-primary"
        >
          {interactive.linkLabel || "Open link"}
        </a>
      </div>
    );
  if (interactive.kind === "location")
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-surface p-8 text-center dark:bg-surface-dark">
        <span className="text-5xl">📍</span>
        <p className="text-lg font-semibold text-text-primary dark:text-text-primary-dark">
          {story.location?.name || interactive.prompt || "Location"}
        </p>
        {(story.location?.city || story.location?.country) && (
          <p className="text-sm text-text-secondary dark:text-text-secondary-dark">
            {[story.location.city, story.location.country].filter(Boolean).join(", ")}
          </p>
        )}
        {story.content?.caption && (
          <p className="max-w-xs whitespace-pre-wrap text-sm text-text-primary dark:text-text-primary-dark">
            {story.content.caption}
          </p>
        )}
        {story.location?.category && (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium capitalize text-primary">
            {story.location.category}
          </span>
        )}
        {story.location?.visitedAt && (
          <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
            Visited {new Date(story.location.visitedAt).toLocaleDateString()}
          </p>
        )}
        {story.location?.coordinates && (
          <a
            target="_blank"
            rel="noreferrer"
            href={`https://www.google.com/maps/search/?api=1&query=${story.location.coordinates.lat},${story.location.coordinates.lng}`}
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-on-primary"
          >
            Open map
          </a>
        )}
      </div>
    );
  if (interactive.kind === "countdown")
    return <CountdownStory interactive={interactive} />;
  if (interactive.kind === "sticker")
    return (
      <div className="flex h-full w-full items-center justify-center bg-surface text-8xl dark:bg-surface-dark">
        {interactive.sticker || "✨"}
      </div>
    );
  if (interactive.kind === "drawing")
    return (
      <div className="flex h-full w-full items-center justify-center bg-white p-4 dark:bg-surface-dark">
        {interactive.drawingData ? (
          <img
            src={interactive.drawingData}
            alt="Story drawing"
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <p className="text-sm text-text-secondary">No drawing</p>
        )}
      </div>
    );
  if (error)
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-sm text-danger">
        Interactive Story unavailable
      </div>
    );
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-surface p-6 dark:bg-surface-dark">
      <p className="text-center text-xl font-semibold text-text-primary dark:text-text-primary-dark">
        {interactive.prompt}
      </p>
      <div className="flex w-full max-w-xs flex-col gap-2">
        {(interactive.options || []).map((option) => {
          const text = option.text || option;
          const count = data?.counts?.[text] || 0;
          return (
            <button
              key={text}
              type="button"
              onClick={() => setValue(text)}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm ${value === text ? "border-primary bg-primary/10 text-primary" : "border-border text-text-primary dark:border-border-dark dark:text-text-primary-dark"}`}
            >
              <span>{text}</span>
              {count > 0 && (
                <span className="text-xs text-text-secondary">{count}</span>
              )}
            </button>
          );
        })}
      </div>
      {interactive.kind === "question" && (
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value.slice(0, 2000))}
          placeholder="Write your answer…"
          className="w-full max-w-xs rounded-xl border border-border bg-background p-3 text-sm text-text-primary dark:border-border-dark dark:bg-background-dark dark:text-text-primary-dark"
        />
      )}
      {
        <button
          type="button"
          onClick={submit}
          disabled={!value || saving}
          className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-on-primary disabled:opacity-50"
        >
          {saving ? "Saving…" : data?.own ? "Update response" : "Submit"}
        </button>
      }
    </div>
  );
}

function CountdownStory({ interactive }) {
  const [remaining, setRemaining] = useState(
    Math.max(0, new Date(interactive.countdownAt).getTime() - Date.now()),
  );
  useEffect(() => {
    const timer = setInterval(
      () =>
        setRemaining(
          Math.max(0, new Date(interactive.countdownAt).getTime() - Date.now()),
        ),
      1000,
    );
    return () => clearInterval(timer);
  }, [interactive.countdownAt]);
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-surface p-8 text-center dark:bg-surface-dark">
      <span className="text-5xl">⏳</span>
      <p className="text-lg font-semibold text-text-primary dark:text-text-primary-dark">
        {interactive.countdownLabel || "Countdown"}
      </p>
      <div className="text-3xl font-bold tabular-nums text-primary">
        {days}d {String(hours).padStart(2, "0")}:
        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </div>
    </div>
  );
}

export default StoryViewer;
