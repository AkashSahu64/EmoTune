import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import VirtualizedList from "../ui/VirtualizedList";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import storyService from "../../services/storyService";
import StoryCircle from "./StoryCircle";
import StoryViewer from "./StoryViewer";
import StoryUploadModal from "./StoryUploadModal";
import { IoClose } from "react-icons/io5";

function getStoryUserInfo(story, userMap) {
  if (story?.userInfo?.username || story?.userInfo?.name || story?.userInfo?.avatar) {
    return {
      username: story.userInfo.username || story.userInfo.name || "",
      avatar: story.userInfo.avatar || "",
    };
  }

  // Some endpoints return a populated `user` object while others return only
  // the owner id. Supporting both shapes prevents valid Stories from being
  // rendered as "Unknown" in Popular/Suggested sections.
  if (story?.user && typeof story.user === "object") {
    return {
      username: story.user.username || story.user.name || "",
      avatar: story.user.avatar || "",
    };
  }

  return userMap[String(story?.user || "")] || {};
}

function StoryFeed({ user, chats, socket, onClose }) {
  const [viewerData, setViewerData] = useState(null);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [showUpload, setShowUpload] = useState(false);
  const [showTrendingModal, setShowTrendingModal] = useState(false);
  const [generatingMemory, setGeneratingMemory] = useState(false);
  const queryClient = useQueryClient();
  const feedQuery = useQuery({
    queryKey: ["stories", "feed"],
    queryFn: async () => (await storyService.getFeed({ fresh: true })).feed,
    // Story visibility can change while this screen is not mounted (for
    // example, another user publishes a public Story). Always reconcile the
    // persisted/cache snapshot with the authorized server feed on mount.
    refetchOnMount: "always",
  });
  const highlightsQuery = useQuery({
    queryKey: ["stories", "highlights"],
    queryFn: async () => (await storyService.getHighlights()).highlights || [],
  });
  const trendingQuery = useQuery({
    queryKey: ["stories", "trending"],
    queryFn: async () => (await storyService.getTrending(15)).stories || [],
  });
  const draftsQuery = useQuery({
    queryKey: ["stories", "drafts"],
    queryFn: async () => (await storyService.getDrafts()).drafts || [],
  });

  const feed = feedQuery.data || null;
  const loading = feedQuery.isLoading;
  const feedError = feedQuery.isError;
  const highlights = highlightsQuery.data || [];
  const trendingStories = useMemo(() => {
    const currentUserId = String(user?._id || "");
    if (!currentUserId) return trendingQuery.data || [];

    return (trendingQuery.data || []).filter((story) => {
      const owner = story?.user;
      const ownerId = String(
        owner && typeof owner === "object" ? owner._id || owner.id || "" : owner || "",
      );
      return !ownerId || ownerId !== currentUserId;
    });
  }, [trendingQuery.data, user?._id]);
  const drafts = draftsQuery.data || [];

  const userMap = useMemo(() => {
    const map = {};
    if (user) map[user._id] = { username: user.username, avatar: user.avatar };
    if (chats) {
      for (const chat of chats) {
        for (const p of chat.participants || []) {
          const u = p.user || p;
          if (u?._id && !map[u._id])
            map[u._id] = { username: u.username, avatar: u.avatar };
        }
      }
    }
    return map;
  }, [user, chats]);

  const fetchFeed = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["stories", "feed"] }),
    [queryClient],
  );

  useEffect(() => {
    if (!socket) return;
    const feedHandler = () => fetchFeed();
    const reactionHandler = () =>
      queryClient.invalidateQueries({ queryKey: ["stories", "feed"] });
    socket.on("story:new", feedHandler);
    socket.on("story:deleted", feedHandler);
    socket.on("story:reaction", reactionHandler);
    return () => {
      socket.off("story:new", feedHandler);
      socket.off("story:deleted", feedHandler);
      socket.off("story:reaction", reactionHandler);
    };
  }, [socket, fetchFeed, queryClient]);

  const handleStoryCreated = useCallback((createdStory) => {
    // Update the owner's view immediately, then reconcile with the server.
    // This prevents a persisted empty feed snapshot from hiding a Story the
    // user has just published while the refetch is in flight.
    if (createdStory?._id) {
      queryClient.setQueryData(["stories", "feed"], (currentFeed) => {
        if (!currentFeed) return currentFeed;
        const existing = currentFeed.myStories || [];
        if (existing.some((story) => String(story._id) === String(createdStory._id))) {
          return currentFeed;
        }
        return { ...currentFeed, myStories: [createdStory, ...existing] };
      });
    }
    fetchFeed();
  }, [fetchFeed, queryClient]);

  const handleCircleClick = useCallback((group, index) => {
    setViewerData(group);
    setViewerIndex(index);
  }, []);

  const friendGroups = useMemo(() => {
    if (!feed?.friendStories) return [];
    const currentUserId = String(user?._id || "");
    return feed.friendStories
      .filter((fs) => String(fs?.user?._id || fs?.user || "") !== currentUserId)
      .map((fs) => ({
        user: fs.user,
        userInfo: fs.userInfo || userMap[fs.user] || {},
        stories: fs.stories,
        hasUnviewed: fs.hasUnviewed,
        isOwn: false,
      }));
  }, [feed?.friendStories, userMap, user?._id]);

  const myGroup = useMemo(() => {
    if (!feed?.myStories?.length) return [];
    return [
      {
        user: user?._id,
        userInfo: { username: user?.username, avatar: user?.avatar },
        stories: feed.myStories,
        isOwn: true,
      },
    ];
  }, [feed?.myStories, user]);

  const viewerGroups = useMemo(
    () => [...myGroup, ...friendGroups],
    [myGroup, friendGroups],
  );

  const memoryStories = useMemo(() => {
    if (!feed?.memoryStories?.length) return [];
    return feed.memoryStories.map((s) => ({
      ...s,
      userInfo: userMap[s.user] || {},
    }));
  }, [feed?.memoryStories, userMap]);

  const suggestedStories = useMemo(() => {
    if (!feed?.suggestedStories?.length) return [];
    return feed.suggestedStories.map((s) => ({
      ...s,
      userInfo: getStoryUserInfo(s, userMap),
    }));
  }, [feed?.suggestedStories, userMap]);

  const trendingHashtags = feed?.trending || [];

  const handleOwnStoryClick = useCallback(() => {
    if (myGroup.length > 0) {
      setViewerData(viewerGroups);
      setViewerIndex(0);
    }
  }, [myGroup, viewerGroups]);

  const handleMemoryStoryClick = useCallback(async () => {
    setGeneratingMemory(true);
    try {
      const data = await storyService.generateMemoryStory();
      if (data.story) {
        toast.success("Memory story created!");
        fetchFeed();
      } else {
        toast.error("Not enough data for a memory story");
      }
    } catch {
      toast.error("Failed to create memory story");
    } finally {
      setGeneratingMemory(false);
    }
  }, [fetchFeed]);

  const handlePublishDraft = useCallback(
    async (draftId) => {
      try {
        await storyService.publishStory(draftId);
        toast.success("Draft published");
        await draftsQuery.refetch();
        fetchFeed();
      } catch {
        toast.error("Failed to publish draft");
      }
    },
    [draftsQuery, fetchFeed],
  );

  const handleDeleteDraft = useCallback(
    async (draftId) => {
      try {
        await storyService.deleteStory(draftId);
        toast.success("Draft deleted");
        draftsQuery.refetch();
      } catch {
        toast.error("Failed to delete draft");
      }
    },
    [draftsQuery],
  );

  const handleCancelSchedule = useCallback(
    async (draftId) => {
      try {
        await storyService.cancelScheduledStory(draftId);
        toast.success("Story schedule cancelled");
        draftsQuery.refetch();
      } catch {
        toast.error("Failed to cancel schedule");
      }
    },
    [draftsQuery],
  );

  if (loading && !feed) {
    return (
      <div className="px-4 py-2 flex gap-3 overflow-x-auto scrollbar-hide">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-1.5 flex-shrink-0 w-[72px]"
          >
            <div className="w-14 h-14 rounded-full shimmer-bg" />
            <div className="h-2.5 w-14 rounded shimmer-bg" />
          </div>
        ))}
      </div>
    );
  }

  if (feedError && !feed) {
    return (
      <div className="mx-4 my-6 flex flex-col items-center justify-center rounded-2xl border border-border bg-surface p-8 text-center shadow-soft dark:border-border-dark dark:bg-surface-dark">
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-danger/10 text-xl text-danger">
          !
        </div>
        <h2 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
          Stories unavailable
        </h2>
        <p className="mt-1 max-w-xs text-xs text-text-secondary dark:text-text-secondary-dark">
          We couldn’t load Stories right now. Check your connection and try
          again.
        </p>
        <button
          type="button"
          onClick={() => feedQuery.refetch()}
          className="mt-4 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-on-primary hover:bg-primary-active"
        >
          Retry
        </button>
      </div>
    );
  }

  const hasStories =
    feed?.myStories?.length > 0 || feed?.friendStories?.length > 0;

  return (
    <div className="border-b border-border dark:border-border-dark">
      <div className="flex items-start justify-between gap-3 border-b border-border/90 bg-surface px-5 py-2 dark:border-border-dark/90 dark:bg-surface-dark">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-text-primary dark:text-text-primary-dark">
            Stories
          </h1>
          <p className="text-sm text-text-secondary dark:text-text-secondary-dark">
            Share moments that disappear in 24 hours.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            aria-label="Back to chats"
            className="rounded-full p-2 font-medium text-text-secondary transition-colors hover:bg-hover/[0.07] dark:border-border-dark dark:text-text-secondary-dark dark:hover:bg-hover-dark/[0.07]"
          >
            <IoClose size={24}/>
          </button>
        </div>
      </div>
      {drafts.length > 0 && (
        <div className="border-b border-border/70 px-4 py-3 dark:border-border-dark/70">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary dark:text-text-secondary-dark">
              Saved drafts
            </span>
            <span className="text-[10px] text-text-secondary dark:text-text-secondary-dark">
              {drafts.length}
            </span>
          </div>
          <div className="space-y-1.5">
            {drafts.slice(0, 3).map((draft) => (
              <div
                key={draft._id}
                className="flex items-center gap-2 rounded-xl border border-border bg-surface p-2 dark:border-border-dark dark:bg-surface-dark"
              >
                <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10 text-xs text-primary dark:bg-primary-dark/15 dark:text-primary-dark">
                  {draft.content?.mediaUrl ? "📷" : "Aa"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-text-primary dark:text-text-primary-dark">
                    {draft.content?.caption ||
                      draft.content?.text ||
                      "Untitled Story"}
                  </p>
                  <p className="text-[10px] text-text-secondary dark:text-text-secondary-dark">
                    {draft.scheduling?.isScheduled
                      ? `Scheduled ${new Date(draft.scheduling.scheduledAt).toLocaleString()}`
                      : "Not published"}
                  </p>
                </div>
                {draft.scheduling?.isScheduled ? (
                  <button
                    type="button"
                    onClick={() => handleCancelSchedule(draft._id)}
                    className="rounded-lg border border-warning/40 px-2 py-1 text-[10px] font-semibold text-warning"
                  >
                    Cancel
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handlePublishDraft(draft._id)}
                    className="rounded-lg bg-primary px-2 py-1 text-[10px] font-semibold text-on-primary"
                  >
                    Publish
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDeleteDraft(draft._id)}
                  className="rounded-lg border border-border px-2 py-1 text-[10px] text-danger dark:border-border-dark"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Main Story Circles */}
      <div className="px-4 py-2">
        {hasStories ? (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            <StoryCircle
              src={user?.avatar}
              name={user?.username}
              isOwn
              hasStory={feed?.myStories?.length > 0}
              onClick={handleOwnStoryClick}
              onAdd={() => setShowUpload(true)}
            />
            <VirtualizedList
              items={friendGroups}
              horizontal
              itemWidth={80}
              itemHeight={80}
              className="flex-1"
              renderItem={(group, i) => (
                <StoryCircle
                  key={group.user}
                  src={group.userInfo?.avatar}
                  name={group.userInfo?.username}
                  viewed={!group.hasUnviewed}
                  hasStory={group.stories?.length > 0}
                  onClick={() => {
                    const idx = (myGroup.length > 0 ? 1 : 0) + i;
                    handleCircleClick(viewerGroups, idx);
                  }}
                />
              )}
            />
          </div>
        ) : (
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <StoryCircle
              src={user?.avatar}
              name={user?.username}
              isOwn
              hasStory={false}
              onClick={undefined}
              onAdd={() => setShowUpload(true)}
            />
          </div>
        )}
      </div>

      {!hasStories && (
        <div className="mx-4 mb-4 rounded-2xl border border-dashed border-border bg-surface/60 px-5 py-6 text-center dark:border-border-dark dark:bg-surface-dark/60">
          <div
            className="mx-auto mb-3 flex items-center justify-center overflow-hidden"
            aria-hidden="true"
          >
            <iframe
              title="Story animation"
              src="https://lottie.host/embed/f6ef0f69-2b26-4c32-a013-d051e98a8a04/Un0trDqXdv.json"
              loading="lazy"
              className="size-full border-0"
              aria-hidden="true"
            />
          </div>
          <h2 className="text-3xl font-bold text-text-primary dark:text-text-primary-dark">
            No stories yet
          </h2>
          <p className="mx-auto mt-3 max-w-md text-md text-text-secondary dark:text-text-secondary-dark">
            Share a moment with your friends or explore Stories when they
            appear.
          </p>
          <p className="mt-4 text-sm font-medium text-primary dark:text-primary-dark">
            Tap the plus on Your Story to share your moment.
          </p>
        </div>
      )}

      {/* Highlights */}
      {highlights.length > 0 && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-semibold text-text-secondary dark:text-text-secondary-dark uppercase tracking-wider">
              ⭐ Highlights
            </span>
            <div className="flex-1 h-px bg-border dark:bg-border-dark" />
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {highlights.map((hl) => {
              const firstStory = hl.stories?.[0];
              const coverUrl =
                hl.coverMedia ||
                firstStory?.mediaUrl ||
                firstStory?.content?.mediaUrl;
              return (
                <motion.button
                  key={hl._id}
                  onClick={() => {
                    const hs = hl.stories || [];
                    if (hs.length > 0) {
                      const groups = [
                        {
                          user: user?._id,
                          userInfo: { username: hl.name, avatar: coverUrl },
                          stories: hs,
                          isOwn: true,
                          isHighlight: true,
                          highlightId: hl._id,
                        },
                      ];
                      handleCircleClick(groups, 0);
                    }
                  }}
                  className="flex flex-col items-center gap-1 flex-shrink-0 w-[60px] focus:outline-none"
                  type="button"
                >
                  <div className="w-12 h-12 rounded-full bg-ai dark:bg-ai-dark p-[2px]">
                    <div
                      className="w-full h-full rounded-full overflow-hidden border-2 border-background dark:border-background-dark"
                      style={{ background: hl.color || "#F2F5F9" }}
                    >
                      {coverUrl ? (
                        <img
                          src={coverUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold">
                          {hl.name?.[0]?.toUpperCase() || "⭐"}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-[8px] text-text-secondary dark:text-text-secondary-dark truncate w-full text-center">
                    {hl.name}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* Memory Stories */}
      {memoryStories.length > 0 && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-semibold text-text-secondary dark:text-text-secondary-dark uppercase tracking-wider">
              🕰️ Memories
            </span>
            <div className="flex-1 h-px bg-border dark:bg-border-dark" />
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {memoryStories.map((s, i) => (
              <div
                key={s._id || i}
                className="flex flex-col items-center gap-1 flex-shrink-0 w-[60px]"
              >
                <motion.button
                  onClick={() => {
                    const groups = [
                      {
                        user: s.user,
                        userInfo: s.userInfo,
                        stories: [s],
                        isOwn: false,
                      },
                    ];
                    handleCircleClick(groups, 0);
                  }}
                  className="w-12 h-12 rounded-full bg-warning dark:bg-warning-dark p-[2px]"
                  type="button"
                >
                  <div className="w-full h-full rounded-full overflow-hidden border-2 border-background dark:border-background-dark">
                    {s.userInfo?.avatar ? (
                      <img
                        src={s.userInfo.avatar}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-ai dark:bg-ai-dark flex items-center justify-center text-white text-[8px] font-bold">
                        🕰️
                      </div>
                    )}
                  </div>
                </motion.button>
                <span className="text-[8px] text-text-secondary dark:text-text-secondary-dark truncate w-full text-center">
                  {s.userInfo?.username || "Memory"}
                </span>
              </div>
            ))}
            <motion.button
              onClick={handleMemoryStoryClick}
              disabled={generatingMemory}
              className="flex flex-col items-center gap-1 flex-shrink-0 w-[60px] py-1 focus:outline-none"
              type="button"
            >
              <div className="w-12 h-12 rounded-full border-2 border-dashed border-yellow-500/50 flex items-center justify-center text-yellow-500/70">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
              <span className="text-[8px] text-yellow-500/70 truncate w-full text-center">
                {generatingMemory ? "..." : "Create"}
              </span>
            </motion.button>
          </div>
        </div>
      )}

      {/* Memory Gen Button (if no memory stories) */}
      {memoryStories.length === 0 && hasStories && (
        <div className="px-4 pb-2">
          <motion.button
            onClick={handleMemoryStoryClick}
            disabled={generatingMemory}
            className="text-[10px] text-yellow-500/70 hover:text-yellow-500 flex items-center gap-1 transition-colors"
            type="button"
          >
            🕰️ {generatingMemory ? "Generating..." : "Generate Memory Story"}
          </motion.button>
        </div>
      )}

      {/* Suggested Stories */}
      {suggestedStories.length > 0 && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-semibold text-text-secondary dark:text-text-secondary-dark uppercase tracking-wider">
              ✨ Suggested
            </span>
            <div className="flex-1 h-px bg-border dark:bg-border-dark" />
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {suggestedStories.slice(0, 4).map((s, i) => (
              <div
                key={s._id || i}
                className="flex min-w-0 items-center gap-2 rounded-xl border border-border/70 bg-surface/60 p-2 dark:border-border-dark/70 dark:bg-surface-dark/60"
              >
                <div className="size-9 shrink-0 overflow-hidden rounded-full bg-primary text-xs font-semibold text-on-primary">
                  {s.userInfo?.avatar ? (
                    <img
                      src={s.userInfo.avatar}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="flex size-full items-center justify-center">
                      {s.userInfo?.username?.[0]?.toUpperCase() || "?"}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-text-primary dark:text-text-primary-dark">
                    {s.userInfo?.username || "Suggested Story"}
                  </p>
                  <p className="truncate text-[11px] text-text-secondary dark:text-text-secondary-dark">
                    {s.reason || "Because you follow this person"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const groups = [
                      {
                        user: s.user,
                        userInfo: s.userInfo,
                        stories: [s],
                        isOwn: false,
                      },
                    ];
                    handleCircleClick(groups, 0);
                  }}
                  className="shrink-0 rounded-lg border border-primary/30 px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10 dark:text-primary-dark"
                >
                  View
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trending Hashtags */}
      {trendingHashtags.length > 0 && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-semibold text-text-secondary dark:text-text-secondary-dark uppercase tracking-wider">
              🔥 Trending
            </span>
            <div className="flex-1 h-px bg-border dark:bg-border-dark" />
          </div>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            {trendingHashtags.slice(0, 10).map((t, i) => (
              <motion.span
                key={t.hashtag || i}
                className="text-[10px] px-2.5 py-1 rounded-full bg-warning dark:bg-warning-dark border border-orange-500/20 text-orange-400 whitespace-nowrap flex-shrink-0"
              >
                {t.hashtag}{" "}
                <span className="text-[8px] text-orange-400/60">{t.count}</span>
              </motion.span>
            ))}
            {trendingHashtags.length > 10 && (
              <motion.button
                onClick={() => setShowTrendingModal(true)}
                className="text-[10px] px-2.5 py-1 rounded-full bg-surface dark:bg-surface-dark backdrop-blur-glass border border-border dark:border-border-dark text-text-secondary dark:text-text-secondary-dark whitespace-nowrap flex-shrink-0"
                type="button"
              >
                View all {trendingHashtags.length}
              </motion.button>
            )}
          </div>
        </div>
      )}

      {/* Trending Stories */}
      {trendingStories.length > 0 && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-semibold text-text-secondary dark:text-text-secondary-dark uppercase tracking-wider">
              🏆 Popular Stories
            </span>
            <div className="flex-1 h-px bg-border dark:bg-border-dark" />
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {trendingStories.slice(0, 8).map((s, i) => {
              const uInfo = getStoryUserInfo(s, userMap);
              return (
                <StoryCircle
                  key={s._id || i}
                  src={uInfo.avatar}
                  name={uInfo.username}
                  size="sm"
                  hasStory
                  onClick={() => {
                    const groups = [
                      {
                        user: s.user,
                        userInfo: uInfo,
                        stories: [s],
                        isOwn: false,
                      },
                    ];
                    handleCircleClick(groups, 0);
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {viewerData && Array.isArray(viewerData) && (
          <StoryViewer
            stories={viewerData}
            initialIndex={viewerIndex}
            user={user}
            chats={chats}
            onClose={() => {
              setViewerData(null);
            }}
            onChanged={() => {
              setViewerData(null);
              queryClient.invalidateQueries({ queryKey: ["stories", "feed"] });
              queryClient.invalidateQueries({ queryKey: ["stories", "highlights"] });
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showUpload && (
          <StoryUploadModal
            onClose={() => setShowUpload(false)}
            onCreated={handleStoryCreated}
            chatId={chats?.[0]?._id}
            audienceUsers={Object.entries(userMap)
              .filter(([id]) => id !== user?._id)
              .map(([id, info]) => ({ _id: id, ...info }))}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTrendingModal && (
          <TrendingModal
            trendingHashtags={trendingHashtags}
            trendingStories={trendingStories}
            userMap={userMap}
            onClose={() => setShowTrendingModal(false)}
            onViewStory={(groups, idx) => {
              setViewerData(groups);
              setViewerIndex(idx);
              setShowTrendingModal(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function TrendingModal({
  trendingHashtags,
  trendingStories,
  userMap,
  onClose,
  onViewStory,
}) {
  const [tab, setTab] = useState("hashtags");
  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      initial={{}}
      animate={{}}
      exit={{}}
      onClick={onClose}
    >
      <motion.div
        className="relative w-full max-w-md mx-4 bg-background dark:bg-background-dark rounded-2xl overflow-hidden border border-border dark:border-border-dark shadow-floating dark:shadow-floating-dark max-h-[80vh] flex flex-col"
        initial={{}}
        animate={{}}
        exit={{}}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border dark:border-border-dark flex-shrink-0">
          <h2 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
            🔥 Trending
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-hover/[0.07] dark:hover:bg-hover-dark/[0.07] text-text-secondary dark:text-text-secondary-dark"
            type="button"
          >
            ✕
          </button>
        </div>
        <div className="flex gap-2 px-5 py-2 border-b border-border dark:border-border-dark">
          {["hashtags", "stories"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${tab === t ? "bg-primary/10 dark:bg-primary-dark/10 text-primary dark:text-primary-dark border border-primary/20 dark:border-primary-dark/20" : "text-text-secondary dark:text-text-secondary-dark hover:bg-hover/[0.07] dark:hover:bg-hover-dark/[0.07]"}`}
              type="button"
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-glass p-4">
          {tab === "hashtags" &&
            trendingHashtags.map((t) => (
              <div
                key={t.hashtag}
                className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-hover/[0.07] dark:hover:bg-hover-dark/[0.07]"
              >
                <span className="text-xs font-medium text-text-primary dark:text-text-primary-dark">
                  {t.hashtag}
                </span>
                <span className="text-[10px] text-text-secondary dark:text-text-secondary-dark">
                  {t.count} stories
                </span>
              </div>
            ))}
          {tab === "stories" &&
            trendingStories.map((s) => {
              const uInfo = userMap[s.user] || {};
              return (
                <motion.button
                  key={s._id}
                  onClick={() =>
                    onViewStory(
                      [
                        {
                          user: s.user,
                          userInfo: uInfo,
                          stories: [s],
                          isOwn: false,
                        },
                      ],
                      0,
                    )
                  }
                  className="w-full flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-hover/[0.07] dark:hover:bg-hover-dark/[0.07] text-left"
                  type="button"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-ai dark:bg-ai-dark">
                    {uInfo.avatar ? (
                      <img
                        src={uInfo.avatar}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-[8px] font-bold">
                        ?
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-text-primary dark:text-text-primary-dark truncate">
                      {uInfo.username || "User"}
                    </p>
                    <p className="text-[10px] text-text-secondary dark:text-text-secondary-dark truncate">
                      {s.content?.text || s.content?.caption || "View story"}
                    </p>
                  </div>
                  <span className="text-[10px] text-text-secondary dark:text-text-secondary-dark flex-shrink-0">
                    🔥 {s.metadata?.viewCount || 0}
                  </span>
                </motion.button>
              );
            })}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default memo(StoryFeed);
