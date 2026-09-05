import { useRef, useEffect, useCallback, memo, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiChevronDown, FiMapPin } from "react-icons/fi";
import MessageBubble from "../MessageBubble/MessageBubble";
import ChatLoadingSkeleton from "./ChatLoadingSkeleton";

function ChatScreen({
  messages,
  loading,
  userId,
  activeChat,
  onReply,
  onEdit,
  onDeleteForMe,
  onDeleteForEveryone,
  onPin,
  onUnpin,
  onForward,
  onShowInfo,
  onBookmark,
  onReact,
  onOpenStory,
  pinnedMessages,
  currentUserAvatar,
}) {
  const scrollRef = useRef(null);
  const messageContentRef = useRef(null);
  const [activePopup, setActivePopup] = useState(null);
  const lastPopupTrigger = useRef(null);
  const updateActivePopup = useCallback((next) => {
    if (next) {
      lastPopupTrigger.current = next.panel === "menu"
        ? `message-menu-${next.messageId}`
        : `reaction-picker-${next.messageId}`;
    }
    setActivePopup(next);
  }, []);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const prevMessagesLength = useRef(messages.length);
  const initialLoadDone = useRef(false);
  const lastChatId = useRef(activeChat?._id || null);
  const isNearBottomRef = useRef(true);

  const getIsNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 150;
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
    setShowScrollBtn(false);
    setNewMessagesCount(0);
    isNearBottomRef.current = true;
  }, []);

  const positionAtLatest = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    setShowScrollBtn(false);
    setNewMessagesCount(0);
    isNearBottomRef.current = true;
  }, []);

  const handleScroll = useCallback(() => {
    setActivePopup(null);
    const nearBottom = getIsNearBottom();
    isNearBottomRef.current = nearBottom;
    if (nearBottom) {
      setShowScrollBtn(false);
      setNewMessagesCount(0);
    } else {
      setShowScrollBtn(true);
    }
  }, [getIsNearBottom]);

  useEffect(() => {
    const closeOnPointerDown = (event) => {
      if (event.target.closest?.('[data-bubble-popup="true"], [data-bubble-trigger="true"]')) return;
      setActivePopup(null);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        const triggerId = lastPopupTrigger.current;
        setActivePopup(null);
        if (triggerId) requestAnimationFrame(() => document.querySelector(`[aria-controls="${triggerId}"][aria-expanded="true"]`)?.focus());
      }
    };
    const closeOnResize = () => setActivePopup(null);
    document.addEventListener("pointerdown", closeOnPointerDown);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", closeOnResize);
    return () => {
      document.removeEventListener("pointerdown", closeOnPointerDown);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", closeOnResize);
    };
  }, []);

  useEffect(() => {
    if (activePopup && !messages.some((message) => String(message._id) === String(activePopup.messageId))) {
      setActivePopup(null);
    }
  }, [activePopup, messages]);

  useEffect(() => {
    setActivePopup(null);
  }, [activeChat?._id]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    const scrollElement = scrollRef.current;
    const contentElement = messageContentRef.current;
    if (!scrollElement || !contentElement || typeof ResizeObserver === "undefined") {
      return undefined;
    }

    let frame = 0;
    let previousScrollHeight = scrollElement.scrollHeight;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const nextScrollHeight = scrollElement.scrollHeight;
        if (
          nextScrollHeight !== previousScrollHeight &&
          isNearBottomRef.current
        ) {
          scrollElement.scrollTop = nextScrollHeight;
        }
        previousScrollHeight = nextScrollHeight;
      });
    });

    observer.observe(contentElement);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [activeChat?._id, loading]);

  useEffect(() => {
    const chatId = activeChat?._id || null;
    const len = messages.length;
    const prevLen = prevMessagesLength.current;

    if (lastChatId.current !== chatId) {
      lastChatId.current = chatId;
      prevMessagesLength.current = 0;
      initialLoadDone.current = false;
      isNearBottomRef.current = true;
    }

    if (len === 0) {
      prevMessagesLength.current = 0;
      return;
    }

    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      requestAnimationFrame(positionAtLatest);
    } else if (len > prevLen && prevLen > 0) {
      if (isNearBottomRef.current) {
        scrollToBottom(true);
      } else {
        setNewMessagesCount((c) => c + (len - prevLen));
        setShowScrollBtn(true);
      }
    }

    prevMessagesLength.current = len;
  }, [activeChat?._id, messages.length, positionAtLatest, scrollToBottom]);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });
  };

  const shouldShowDateSeparator = useCallback(
    (index) => {
      if (index === 0) return true;
      const curr = new Date(messages[index].createdAt);
      const prev = new Date(messages[index - 1].createdAt);
      return curr.toDateString() !== prev.toDateString();
    },
    [messages],
  );

  const findPinnedMessage = (msgId) => pinnedMessages?.includes(msgId);

  const getGroupInfo = useCallback(
    (index) => {
      const msg = messages[index];
      const prev = messages[index - 1];
      const next = messages[index + 1];

      const prevSenderId = String(prev?.sender?._id || prev?.sender || "");
      const currSenderId = String(msg?.sender?._id || msg?.sender || "");
      const nextSenderId = String(next?.sender?._id || next?.sender || "");
      const closeTime = (a, b) =>
        Boolean(a && b) &&
        Math.abs(new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) < 5 * 60 * 1000;

      const sameAsPrev =
        prev &&
        prevSenderId === currSenderId &&
        closeTime(prev, msg) &&
        !shouldShowDateSeparator(index);

      const sameAsNext =
        next &&
        nextSenderId === currSenderId &&
        closeTime(msg, next) &&
        !shouldShowDateSeparator(index + 1);

      return {
        isFirstInGroup: !sameAsPrev,
        isLastInGroup: !sameAsNext,
      };
    },
    [messages, shouldShowDateSeparator],
  );

  const firstUnreadIndex = useMemo(
    () =>
      messages.findIndex((message) => {
        const senderId = message.sender?._id || message.sender;
        const readByUser = message.readBy?.some(
          (entry) =>
            String(entry?._id || entry?.user || entry) === String(userId),
        );
        return String(senderId) !== String(userId) && !readByUser;
      }),
    [messages, userId],
  );

  const mediaMessages = useMemo(
    () =>
      messages.filter((message) =>
        ["image", "video", "gif", "sticker"].includes(message.type),
      ),
    [messages],
  );

  if (loading) {
    return <ChatLoadingSkeleton />;
  }

  if (messages.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
        <img
          src="/message.gif"
          alt=""
          className="mb-5 h-64 w-64 object-contain"
          aria-hidden="true"
        />
        <h2 className="mb-2 text-base font-semibold text-text-primary dark:text-text-primary-dark">
          No messages yet
        </h2>
        <p className="max-w-sm text-sm leading-relaxed text-text-secondary dark:text-text-secondary-dark">
          Start with a thought, a file, a song, or a simple hello.
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-chat-background dark:bg-chat-background-dark text-chat-incoming-text dark:text-chat-incoming-text-dark">
      {pinnedMessages?.length > 0 && (
        <div
          className="absolute top-3 left-1/2 z-20 flex w-[min(440px,calc(100%-32px))] min-h-[46px] -translate-x-1/2 items-center gap-2 rounded-2xl border border-border dark:border-border-dark bg-surface-elevated/90 dark:bg-surface-elevated-dark/90 backdrop-blur-glass px-3 py-2 shadow-lg"
          role="status"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 dark:bg-primary-dark/10 text-primary dark:text-primary-dark">
            <FiMapPin aria-hidden="true" size={14} />
          </span>
          <span className="flex-1 text-sm">
            <strong className="text-text-primary dark:text-text-primary-dark">Pinned messages</strong>
            <span className="ml-1 text-text-secondary dark:text-text-secondary-dark">
              {pinnedMessages.length} saved in this conversation
            </span>
          </span>
          <span className="rounded-lg bg-primary/10 dark:bg-primary-dark/10 px-2 py-1 text-[9px] font-bold text-primary dark:text-primary-dark">
            Pinned
          </span>
        </div>
      )}
      <div
        ref={scrollRef}
        className="flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col overflow-y-auto py-2 scrollbar-glass [scrollbar-color:#9CA3AF_transparent] [&::-webkit-scrollbar]:w-[7px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#9CA3AF]"
        role="log"
        aria-label="Messages"
        aria-live="polite"
      >
        <div ref={messageContentRef} className="w-full min-w-0">
          <AnimatePresence initial={false}>
            {messages.map((message, index) => {
            const { isFirstInGroup, isLastInGroup } = getGroupInfo(index);
            const isOwn = String(message.sender?._id || message.sender) === String(userId);

            return (
              <div
                key={message.clientMessageId || message._id || index}
                className="w-full min-w-0 [content-visibility:auto] [contain-intrinsic-size:0_78px]"
              >
                {index === firstUnreadIndex && firstUnreadIndex > 0 && (
                  <div
                    className="flex items-center gap-2.5 px-4 py-3 text-[9px] font-bold text-primary dark:text-primary-dark uppercase tracking-wider"
                    role="separator"
                    aria-label="Unread messages"
                  >
                    <span>Unread messages</span>
                  </div>
                )}
                {shouldShowDateSeparator(index) && (
                  <div className="flex items-center justify-center py-4">
                    <motion.span
                      initial={{}}
                      animate={{}}
                      transition={{ duration: 0.2 }}
                      className="rounded-full bg-surface px-3 py-1 text-[11px] font-semibold text-text-secondary shadow-xs"
                    >
                      {formatDate(message.createdAt)}
                    </motion.span>
                  </div>
                )}
                <motion.div
                  initial={{}}
                  animate={{}}
                  exit={{}}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                >
                  <MessageBubble
                    message={message}
                    mediaMessages={mediaMessages}
                    isOwn={isOwn}
                    showSender={activeChat?.type === "group"}
                    userId={userId}
                    onReply={onReply}
                    onEdit={onEdit}
                    onDeleteForMe={onDeleteForMe}
                    onDeleteForEveryone={onDeleteForEveryone}
                    onPin={onPin}
                    onUnpin={onUnpin}
                    onForward={onForward}
                    onShowInfo={onShowInfo}
                    onBookmark={onBookmark}
                    onReact={onReact}
                    onOpenStory={onOpenStory}
                    isPinned={findPinnedMessage(message._id)}
                    currentUserAvatar={currentUserAvatar}
                    activePopup={activePopup}
                    onPopupChange={updateActivePopup}
                    popupBoundaryRef={scrollRef}
                    receiverAvatar={
                      activeChat?.avatar ||
                      activeChat?.profileImage ||
                      activeChat?.profile_image ||
                      activeChat?.photo ||
                      activeChat?.image ||
                      ""
                    }
                    isFirstInGroup={isFirstInGroup}
                    isLastInGroup={isLastInGroup}
                  />
                </motion.div>
              </div>
            );
            })}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {showScrollBtn && (
          <motion.button
            initial={{}}
            animate={{}}
            exit={{}}
            onClick={() => scrollToBottom(true)}
            className="absolute bottom-4 right-4 h-10 rounded-full bg-surface-elevated dark:bg-surface-elevated-dark backdrop-blur-glass border border-border dark:border-border-dark flex items-center gap-2 px-3 shadow-lg transition-colors z-10 focus:outline-none focus:ring-2 focus:ring-focus dark:focus:ring-focus-dark hover:bg-hover/[0.07] dark:hover:bg-hover-dark/[0.07]"
            aria-label={
              newMessagesCount > 0
                ? `${newMessagesCount} new message${newMessagesCount > 1 ? "s" : ""}`
                : "Scroll to latest"
            }
            type="button"
          >
            {newMessagesCount > 0 && (
              <span className="text-[11px] font-medium tabular-nums text-primary dark:text-primary-dark">
                {newMessagesCount}
              </span>
            )}
            <FiChevronDown size={16} className="text-text-secondary dark:text-text-secondary-dark" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

export default memo(ChatScreen);
