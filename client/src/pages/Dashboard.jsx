import {
  lazy,
  Suspense,
  useState,
  useEffect,
  useCallback,
  useRef,
  memo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import { useSocket } from "../hooks/useSocket";
import { useTheme } from "../hooks/useTheme";
import { usePersona } from "../hooks/usePersona";
import useNotificationSound from "../hooks/useNotificationSound";
import SEO from "../components/SEO/SEO";
import {
  WebPageSchema,
  BreadcrumbSchema,
  SoftwareApplicationSchema,
} from "../utils/schema";

import Sidebar from "../components/Sidebar/Sidebar";
import Navbar from "../components/Navbar/Navbar";
import StoryFeed from "../components/Stories/StoryFeed";
import StoryViewer from "../components/Stories/StoryViewer";
import ChatScreen from "../components/ChatScreen/ChatScreen";
import MessageInput from "../components/MessageInput/MessageInput";
import SuggestionPanel from "../components/SuggestionPanel/SuggestionPanel";
import { HorizontalIntentFilter } from "../components/IntentFilterBar/IntentFilterBar";
import BookmarksPanel from "../components/BookmarksPanel/BookmarksPanel";
import ThemeSwitcher from "../components/ThemeSwitcher/ThemeSwitcher";
import Settings from "../components/Settings/Settings";
import NewChatModal from "../components/NewChatModal/NewChatModal";
import GroupModal from "../components/GroupModal/GroupModal";
import PersonaSelector from "../components/PersonaSelector/PersonaSelector";
import RightPanel from "../components/ChatScreen/RightPanel";
import ForwardModal from "../components/MessageBubble/ForwardModal";
import MessageInfoModal from "../components/MessageBubble/MessageInfoModal";
import SilentInboxModal from "../components/SilentInboxModal/SilentInboxModal";
import { Button } from "../components/ui";

import api, {
  messageService,
  ghostService,
  decideService,
  chatService,
  bookmarkService,
} from "../services/api";
import AI_SERVICE from "../services/aiService";
const GhostCollaboration = lazy(
  () => import("../components/GhostCollaboration/GhostCollaboration"),
);
import DecideFlow from "../components/DecideFlow/DecideFlow";
import useChats from "../features/chat/hooks/useChats";
import useMessages from "../features/chat/hooks/useMessages";
import useChatLayout from "../features/chat/hooks/useChatLayout";
import useChatSocket from "../features/chat/hooks/useChatSocket";
import useNormalizedChatState from "../features/chat/hooks/useNormalizedChatState";
import useTyping from "../features/chat/hooks/useTyping";
import { applyReactionSelection, normalizeReactions } from "../components/MessageBubble/utils/reactionHelpers";
import {
  createClientMessageId,
  markMessageFailed,
  reconcileMessage,
} from "../features/chat/utils/messageReconciliation";

import {
  FiSearch,
  FiEdit3,
  FiShield,
  FiClock,
  FiLayers,
  FiBarChart2,
} from "react-icons/fi";

const webPageSchema = WebPageSchema({
  title: "Dashboard - Emotune",
  description:
    "Your Emotune dashboard for AI-powered emotional chat, memory mesh, personas, and intelligent conversations.",
  url: "https://emotune.app/app",
  dateModified: new Date().toISOString(),
});

const breadcrumbSchema = BreadcrumbSchema({
  items: [
    { name: "Home", path: "/" },
    { name: "Dashboard", path: "/app" },
  ],
});

function Dashboard() {
  const navigate = useNavigate();
  const { chatId } = useParams();
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const { socket, isConnected, onlineUsers } = useSocket();
  const {
    theme,
    setTheme,
  } = useTheme();
  const { activePersona, personas, setActivePersona, clearActivePersona } =
    usePersona();

  const [activeChat, setActiveChat] = useState(null);
  const {
    chats,
    setChats,
    loadingChats,
    fetchChats,
    updateChat,
    upsertChat,
    applyMessageEvent,
  } = useChats();
  const [suggestions, setSuggestions] = useState(null);
  const [isSilent, setIsSilent] = useState(false);
  const { showSidebar, setShowSidebar, showRightPanel, setShowRightPanel } =
    useChatLayout();
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showThemeSwitcher, setShowThemeSwitcher] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeIntent, setActiveIntent] = useState("all");
  const [intentCounts, setIntentCounts] = useState({});
  const [showNewChat, setShowNewChat] = useState(false);
  const [pendingBookmark, setPendingBookmark] = useState(null);
  const bookmarkRequests = useRef(new Set());
  const { typingUsers, handleTyping, handleTypingStart, handleTypingStop } =
    useTyping({ socket, chatId: activeChat?._id, currentUserId: user?._id });
  const { messages, setMessages, loadingMessages } = useMessages(
    activeChat?._id,
    activeIntent,
  );
  const normalizedState = useNormalizedChatState({
    chats,
    messages,
    typingUsers,
    activeChatId: activeChat?._id,
    presence: onlineUsers,
  });
  const [silentInboxCount, setSilentInboxCount] = useState(0);
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [forwardMessage, setForwardMessage] = useState(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [messageInfo, setMessageInfo] = useState(null);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showPersonaModal, setShowPersonaModal] = useState(false);
  const [showSilentInbox, setShowSilentInbox] = useState(false);
  const [showStoryPanel, setShowStoryPanel] = useState(false);
  const [chatStoryViewer, setChatStoryViewer] = useState(null);
  const [showIntroVideo, setShowIntroVideo] = useState(() => {
    try {
      return (
        window.sessionStorage.getItem("emotune-logo-intro-played") !== "true"
      );
    } catch {
      return true;
    }
  });
  const [showGhostSession, setShowGhostSession] = useState(false);
  const [ghostSession, setGhostSession] = useState(null);
  const [showDecideFlow, setShowDecideFlow] = useState(false);
  const [intentFilterExpanded, setIntentFilterExpanded] = useState(true);
  const pendingReactionRequests = useRef(new Map());
  const optimisticReactionState = useRef(new Map());
  const canonicalReactionState = useRef(new Map());
  const actionRequests = useRef(new Set());
  const { play, playAllowed } = useNotificationSound();

  useEffect(() => {
    if (!chatId) {
      setActiveChat(null);
      return;
    }
    if (!chats.length) return;
    const routedChat = chats.find((chat) => chat._id === chatId);
    if (routedChat)
      setActiveChat((current) =>
        current?._id === routedChat._id ? current : routedChat,
      );
  }, [chatId, chats]);

  const fetchIntentCounts = useCallback(async (chatId) => {
    if (!chatId) return;
    try {
      const { data } = await messageService.getIntentCounts(chatId);
      setIntentCounts(data.counts || {});
    } catch {}
  }, []);
  const fetchSuggestions = useCallback(
    async (chatId) => {
      try {
        const data = await AI_SERVICE.getSuggestions(chatId);
        setSuggestions(data);
      } catch {
        setSuggestions(null);
      }
    },
    [],
  );

  useEffect(() => {
    if (activeChat) {
      fetchSuggestions(activeChat._id);
      fetchIntentCounts(activeChat._id);
      socket?.emit("join:chat", { chatId: activeChat._id });
      return () => socket?.emit("leave:chat", { chatId: activeChat._id });
    }
  }, [activeChat, socket, fetchIntentCounts, fetchSuggestions]);

  useEffect(() => {
    if (!activeChat || !user) return;
    const unreadIds = messages
      .filter((m) => {
        const senderId =
          typeof m.sender === "string" ? m.sender : m.sender?._id;
        return (
          senderId !== user._id &&
          !m.readBy?.some((r) => {
            const rid = typeof r === "string" ? r : r._id || r.user;
            return rid && rid.toString() === user._id.toString();
          })
        );
      })
      .map((m) => m._id);
    if (unreadIds.length > 0) {
      const timer = setTimeout(() => {
        messageService
          .markRead(unreadIds, activeChat._id)
          .then(() => updateChat(activeChat._id, { unreadCount: 0 }))
          .catch(() => {});
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [messages, activeChat, user, updateChat]);

  const handleNewMessage = useCallback(
    (data) => {
      const { message, silent } = data;
      if (
        message.chat === activeChat?._id ||
        message.chat?._id === activeChat?._id
      ) {
        if (!silent) {
          setMessages((prev) => reconcileMessage(prev, message));
        }
        if (message.sender !== user?._id && message.sender?._id !== user?._id)
          socket?.emit("message:delivered", {
            messageIds: [message._id],
            chatId: message.chat?._id || message.chat,
          });
      } else if (
        !silent &&
        message.sender !== user?._id &&
        playAllowed(user?.preferences)
      )
        play();
      if (silent) setSilentInboxCount((prev) => prev + 1);
      applyMessageEvent(message, user?._id);
    },
    [
      activeChat,
      user,
      play,
      playAllowed,
      socket,
      applyMessageEvent,
    ],
  );

  useChatSocket({
    socket,
    handlers: {
      onDelivered: ({ messageIds, userId: deliveredBy }) =>
        setMessages((prev) =>
          prev.map((m) =>
            messageIds.includes(m._id)
              ? {
                  ...m,
                  deliveredTo: m.deliveredTo?.some(
                    (d) =>
                      String(d?._id || d?.user || d) === String(deliveredBy),
                  )
                    ? m.deliveredTo
                    : [...(m.deliveredTo || []), deliveredBy],
                }
              : m,
          ),
        ),
      onRead: ({ messageIds, userId: readBy }) =>
        setMessages((prev) =>
          prev.map((m) =>
            messageIds.includes(m._id)
              ? {
                  ...m,
                  readBy: m.readBy?.some(
                    (reader) =>
                      String(reader?._id || reader?.user || reader) ===
                      String(readBy),
                  )
                    ? m.readBy
                    : [...(m.readBy || []), readBy],
                }
              : m,
          ),
        ),
      onMessage: handleNewMessage,
      onNewChat: ({ chat }) => upsertChat(chat),
      onTypingStart: ({ userId: typingUserId, chatId: eventChatId }) =>
        handleTypingStart(typingUserId, eventChatId),
      onTypingStop: ({ userId: typingUserId, chatId: eventChatId }) =>
        handleTypingStop(typingUserId, eventChatId),
      onEdited: ({ messageId, content, editedAt }) =>
        setMessages((prev) =>
          prev.map((m) =>
            m._id === messageId ? { ...m, content, editedAt } : m,
          ),
        ),
      onDeleted: ({ messageId, forEveryone }) =>
        setMessages((prev) =>
          forEveryone
            ? prev.filter((m) => m._id !== messageId)
            : prev.map((m) =>
                m._id === messageId
                  ? { ...m, deletedFor: [...(m.deletedFor || []), "hidden"] }
                  : m,
              ),
        ),
      onSilentAccepted: () =>
        setSilentInboxCount((prev) => Math.max(0, prev - 1)),
      onPinned: ({ messageId, pinned }) =>
        setMessages((prev) =>
          prev.map((m) =>
            m._id === messageId ? { ...m, isPinned: pinned } : m,
          ),
        ),
      onReaction: ({ messageId, reactions }) => {
        const normalized = normalizeReactions(reactions);
        canonicalReactionState.current.set(String(messageId), normalized);
        if (pendingReactionRequests.current.has(String(messageId))) return;
        setMessages((prev) =>
          prev.map((m) => (m._id === messageId ? { ...m, reactions: normalized } : m)),
        );
      },
      onProfileUpdated: ({ user: updatedUser }) => {
        setChats((prev) =>
          prev.map((chat) => ({
            ...chat,
            otherUser:
              chat.otherUser?._id === updatedUser._id
                ? { ...chat.otherUser, ...updatedUser }
                : chat.otherUser,
            participants: chat.participants?.map((p) =>
              p.user?._id === updatedUser._id
                ? { ...p, user: { ...p.user, ...updatedUser } }
                : p,
            ),
          })),
        );
        setActiveChat((prev) =>
          prev?.otherUser?._id === updatedUser._id
            ? { ...prev, otherUser: { ...prev.otherUser, ...updatedUser } }
            : prev,
        );
      },
    },
  });

  const handleSendMessage = useCallback(
    async (content, type = "text", metadata = {}) => {
      if (!activeChat) return;
      const editKey = editingMessage ? `edit:${editingMessage._id}` : null;
      if (editKey && actionRequests.current.has(editKey)) return;
      if (editKey) actionRequests.current.add(editKey);
      try {
        if (editingMessage) {
          await messageService.edit(editingMessage._id, content);
          setMessages((prev) =>
            prev.map((m) =>
              m._id === editingMessage._id
                ? { ...m, content, editedAt: new Date().toISOString() }
                : m,
            ),
          );
          setEditingMessage(null);
          toast.success("Message edited");
          return;
        }
        if (!content.trim()) return false;
        const { mediaUrl, fileType: mType, ...restMetadata } = metadata;
        const clientMessageId = createClientMessageId();
        const now = new Date().toISOString();
        const optimisticMessage = {
          _id: `optimistic-${clientMessageId}`,
          clientMessageId,
          sender: user,
          chat: activeChat._id,
          content,
          type,
          metadata: restMetadata,
          mediaUrl: mediaUrl || "",
          mediaType: mType || "",
          silent: isSilent,
          personaUsed: activePersona?.name || "",
          replyTo: replyToMessage?._id,
          createdAt: now,
          updatedAt: now,
          isOptimistic: true,
          messageStatus: "sending",
          status: "sending",
        };
        setMessages((prev) => reconcileMessage(prev, optimisticMessage));

        const { data } = await messageService.send({
          clientMessageId,
          content,
          chatId: activeChat._id,
          type,
          metadata: restMetadata,
          mediaUrl: mediaUrl || "",
          mediaType: mType || "",
          silent: isSilent,
          personaUsed: activePersona?.name || "",
          ...(replyToMessage ? { replyTo: replyToMessage._id } : {}),
        });
        if (data?.message) {
          setMessages((prev) => reconcileMessage(prev, data.message));
        }
        setReplyToMessage(null);
        return true;
      } catch (err) {
        if (!editingMessage) {
          let clientMessageId = null;
          try {
            const payload = typeof err.config?.data === "string"
              ? JSON.parse(err.config.data)
              : err.config?.data || {};
            clientMessageId = payload.clientMessageId;
          } catch {
            clientMessageId = null;
          }
          if (clientMessageId) {
            setMessages((prev) =>
              markMessageFailed(prev, clientMessageId, "Failed to send message"),
            );
          }
        }
        toast.error("Failed to send message");
        return false;
      } finally {
        if (editKey) actionRequests.current.delete(editKey);
      }
    },
    [
      activeChat,
      user,
      editingMessage,
      isSilent,
      activePersona,
      replyToMessage,
      setMessages,
    ],
  );

  const sendBookmarkToChat = useCallback(async (bookmark, chat = activeChat) => {
    if (!chat || !bookmark) return false;
    const content = bookmark.content || bookmark.metadata?.shayari || bookmark.metadata?.songTitle || bookmark.metadata?.emoji || bookmark.metadata?.videoQuery || "Saved bookmark";
    const sent = await handleSendMessage(content, bookmark.type || "text", bookmark.metadata || {});
    if (!sent) return false;
    try {
      await bookmarkService.increment(bookmark._id);
      toast.success("Bookmark sent");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.error || "Message sent, but bookmark usage was not updated");
      return true;
    }
  }, [activeChat, handleSendMessage]);

  const handleSendBookmark = useCallback((bookmark) => {
    if (activeChat) {
      return sendBookmarkToChat(bookmark);
    }
    setPendingBookmark(bookmark);
    setShowNewChat(true);
    toast.info("Choose a conversation to send this bookmark");
    return true;
  }, [activeChat, sendBookmarkToChat]);

  useEffect(() => {
    if (!activeChat || !pendingBookmark) return;
    const bookmark = pendingBookmark;
    setPendingBookmark(null);
    sendBookmarkToChat(bookmark, activeChat);
  }, [activeChat, pendingBookmark, sendBookmarkToChat]);

  const handleSelectChat = useCallback(
    (chat) => {
      setShowStoryPanel(false);
      setActiveChat(chat);
      setShowRightPanel(false);
      setShowAIPanel(false);
      if (chat?._id && chat._id !== chatId) navigate(`/app/chat/${chat._id}`);
    },
    [chatId, navigate],
  );
  const handleOpenStoryPanel = useCallback(() => {
    setShowStoryPanel(true);
    setActiveChat(null);
    setShowRightPanel(false);
    if (chatId) navigate("/app");
  }, [chatId, navigate, setShowRightPanel]);
  const handleOpenStoryFromMessage = useCallback((story) => {
    if (!story?._id) return;
    const owner = story.user && typeof story.user === "object" ? story.user : null;
    const ownerId = owner?._id || story.user;
    setChatStoryViewer({
      stories: [{
        user: ownerId,
        userInfo: {
          username: owner?.username || owner?.name || "",
          avatar: owner?.avatar || "",
        },
        stories: [story],
        isOwn: String(ownerId || "") === String(user?._id || ""),
      }],
      initialIndex: 0,
    });
    setShowAIPanel(false);
    setShowBookmarks(false);
    setShowDecideFlow(false);
    setShowRightPanel(true);
  }, [user?._id]);
  const finishIntroVideo = useCallback(() => {
    try {
      window.sessionStorage.setItem("emotune-logo-intro-played", "true");
    } catch {
      // The visual fallback still works when storage is unavailable.
    }
    setShowIntroVideo(false);
  }, []);
  const handleUpdateChatPreference = useCallback(
    async (chat, preference) => {
      const previous = { ...chat };
      updateChat(chat._id, preference);
      try {
        const { data } = await chatService.updatePreferences(
          chat._id,
          preference,
        );
        updateChat(chat._id, data.preferences);
      } catch {
        updateChat(chat._id, previous);
        toast.error("Could not update chat preference");
      }
    },
    [updateChat],
  );
  const handleMarkAllChatsRead = useCallback(() => {
    setChats((previous) =>
      previous.map((chat) => ({ ...chat, unreadCount: 0 })),
    );
  }, []);
  const handleIntentFilter = useCallback((intent) => {
    setActiveIntent(intent);
  }, []);
  const handleReply = useCallback((message) => {
    setReplyToMessage(message);
    setEditingMessage(null);
  }, []);
  const handleReact = useCallback(async (message, emoji) => {
    const messageId = String(message._id);
    const previous = pendingReactionRequests.current.get(messageId);
    const requestId = (previous?.requestId || 0) + 1;
    const current = optimisticReactionState.current.get(messageId)
      || canonicalReactionState.current.get(messageId)
      || normalizeReactions(message.reactions);
    const rollback = canonicalReactionState.current.get(messageId) || current;
    const optimistic = applyReactionSelection(current, user?._id, emoji, user);
    optimisticReactionState.current.set(messageId, optimistic);
    setMessages((prev) => prev.map((item) => (
      item._id === message._id ? { ...item, reactions: optimistic } : item
    )));
    const request = (previous?.chain || Promise.resolve()).catch(() => {}).then(async () => {
      const { data } = await messageService.react(message._id, emoji);
      if (pendingReactionRequests.current.get(messageId)?.requestId !== requestId) return;
      const canonical = normalizeReactions(data.reactions);
      canonicalReactionState.current.set(messageId, canonical);
      optimisticReactionState.current.set(messageId, canonical);
      setMessages((prev) =>
        prev.map((m) => (m._id === message._id ? { ...m, reactions: canonical } : m)),
      );
    });
    pendingReactionRequests.current.set(messageId, { requestId, emoji, chain: request });
    try {
      await request;
    } catch {
      if (pendingReactionRequests.current.get(messageId)?.requestId === requestId) {
        optimisticReactionState.current.set(messageId, rollback);
        setMessages((prev) => prev.map((item) => (
          item._id === message._id ? { ...item, reactions: rollback } : item
        )));
        toast.error("Failed to update reaction");
      }
    } finally {
      if (pendingReactionRequests.current.get(messageId)?.requestId === requestId) {
        pendingReactionRequests.current.delete(messageId);
        optimisticReactionState.current.delete(messageId);
      }
    }
  }, [setMessages, user]);
  const handleEdit = useCallback((message) => {
    setEditingMessage(message);
    setReplyToMessage(null);
  }, []);
  const handleDeleteForMe = useCallback(
    async (message) => {
      const key = `delete-me:${message._id}`;
      if (actionRequests.current.has(key)) return;
      actionRequests.current.add(key);
      try {
        await messageService.delete(message._id);
        setMessages((prev) =>
          prev.map((m) =>
            m._id === message._id
              ? { ...m, deletedFor: [...(m.deletedFor || []), user._id] }
              : m,
          ),
        );
        toast.success("Message deleted");
      } catch {
        toast.error("Failed to delete message");
      } finally {
        actionRequests.current.delete(key);
      }
    },
    [user],
  );
  const handleDeleteForEveryone = useCallback(async (message) => {
    const key = `delete-everyone:${message._id}`;
    if (actionRequests.current.has(key)) return;
    actionRequests.current.add(key);
    try {
      await messageService.deleteEveryone(message._id);
      setMessages((prev) => prev.filter((m) => m._id !== message._id));
      toast.success("Message deleted for everyone");
    } catch {
      toast.error("Failed to delete message");
    } finally {
      actionRequests.current.delete(key);
    }
  }, []);
  const handlePin = useCallback(async (message) => {
    const key = `pin:${message._id}`;
    if (actionRequests.current.has(key)) return;
    actionRequests.current.add(key);
    try {
      await messageService.pin(message._id);
      setMessages((prev) =>
        prev.map((m) => (m._id === message._id ? { ...m, isPinned: true } : m)),
      );
      toast.success("Message pinned");
    } catch {
      toast.error("Failed to pin message");
    } finally {
      actionRequests.current.delete(key);
    }
  }, []);
  const handleUnpin = useCallback(async (message) => {
    const key = `unpin:${message._id}`;
    if (actionRequests.current.has(key)) return;
    actionRequests.current.add(key);
    try {
      await messageService.unpin(message._id);
      setMessages((prev) =>
        prev.map((m) =>
          m._id === message._id ? { ...m, isPinned: false } : m,
        ),
      );
      toast.success("Message unpinned");
    } catch {
      toast.error("Failed to unpin message");
    } finally {
      actionRequests.current.delete(key);
    }
  }, []);
  const handleForward = useCallback(async (message, targetChatId) => {
    const key = `forward:${message._id}:${targetChatId}`;
    if (actionRequests.current.has(key)) return;
    actionRequests.current.add(key);
    try {
      await messageService.forward(message._id, targetChatId);
      setShowForwardModal(false);
      setForwardMessage(null);
      toast.success("Message forwarded");
    } catch {
      toast.error("Failed to forward message");
    } finally {
      actionRequests.current.delete(key);
    }
  }, []);
  const handleShowInfo = useCallback((message) => {
    setMessageInfo(message);
  }, []);
  const cancelReply = useCallback(() => {
    setReplyToMessage(null);
  }, []);
  const cancelEdit = useCallback(() => {
    setEditingMessage(null);
  }, []);
  const handleAcceptSilent = useCallback((result, newCount) => {
    if (newCount !== undefined) setSilentInboxCount(newCount);
    else if (result?.all) setSilentInboxCount(0);
    else if (result) setSilentInboxCount((prev) => Math.max(0, prev - 1));
  }, []);

  const handleStartGhostSession = useCallback(
    async (type = "whiteboard") => {
      if (!activeChat) return;
      try {
        const { data } = await ghostService.create({
          chatId: activeChat._id,
          type,
          ttl: 7200,
        });
        setGhostSession(data.session);
        setShowGhostSession(true);
        toast.success("Ghost session started!");
      } catch (err) {
        toast.error(
          err.response?.data?.error || "Failed to start ghost session",
        );
      }
    },
    [activeChat],
  );

  const handleCloseGhostSession = useCallback(() => {
    setShowGhostSession(false);
    setGhostSession(null);
  }, []);

  const handleOpenDecideFlow = useCallback(() => {
    setShowDecideFlow(true);
    setShowRightPanel(true);
  }, []);

  const handleCloseDecideFlow = useCallback(() => {
    setShowDecideFlow(false);
  }, []);

  const isUserOnline = useCallback(
    (userId) => onlineUsers.has(userId),
    [onlineUsers],
  );
  const isTyping = Object.values(typingUsers).some(Boolean);

  const handleBookmark = useCallback(async (typeOrPayload, legacyData) => {
    const payload = typeOrPayload && typeof typeOrPayload === "object"
      ? typeOrPayload
      : {
          type: typeOrPayload,
          source: "ai",
          content: typeof legacyData === "string" ? legacyData : undefined,
          metadata: typeof legacyData === "object" ? legacyData : {},
        };
    const metadata = payload.metadata || {};
    const content = payload.content || metadata.shayari || metadata.songTitle || metadata.emoji || metadata.videoQuery || "";
    const type = payload.type;
    const source = payload.source || "other";
    const requestKey = `${type}:${source}:${content}:${JSON.stringify(metadata)}`;
    if (bookmarkRequests.current.has(requestKey)) return;
    bookmarkRequests.current.add(requestKey);
    try {
      await bookmarkService.create({
        type,
        source,
        content,
        metadata,
        ...(Array.isArray(payload.tags) ? { tags: payload.tags } : {}),
      });
      await queryClient.invalidateQueries({ queryKey: ["bookmarks", user?._id] });
      toast.success("Saved to bookmarks");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to save bookmark");
      return false;
    } finally {
      bookmarkRequests.current.delete(requestKey);
    }
  }, [queryClient, user?._id]);

  const handleBookmarkMessage = useCallback(async (message) => {
    if (!message) return false;
    const rawType = String(message.type || "text").toLowerCase();
    const type = rawType === "song" ? "song" : rawType === "video" ? "video" : ["image", "gif", "sticker", "audio", "voice", "file", "document"].includes(rawType) ? "image" : "text";
    const metadata = message.metadata || {};
    const content = String((type === "image" && message.mediaUrl) || message.content || metadata.emoji || metadata.fileName || message.mediaUrl || "").trim();
    const objectId = /^[a-f\d]{24}$/i;
    const sourceChatId = message.chat?._id || message.chat || activeChat?._id;
    const referenceMetadata = {
      ...(metadata.emoji ? { emoji: metadata.emoji } : {}),
      ...(metadata.songTitle ? { songTitle: metadata.songTitle } : {}),
      ...(metadata.songArtist ? { songArtist: metadata.songArtist } : {}),
      ...(metadata.songClipUrl ? { songClipUrl: metadata.songClipUrl } : {}),
      ...(metadata.videoQuery ? { videoQuery: metadata.videoQuery } : {}),
      ...(metadata.videoEmbedUrl ? { videoEmbedUrl: metadata.videoEmbedUrl } : {}),
      ...(metadata.lyrics ? { lyrics: metadata.lyrics } : {}),
      ...(objectId.test(String(message._id || "")) ? { originalMessageId: String(message._id) } : {}),
      ...(objectId.test(String(sourceChatId || "")) ? { sourceChatId: String(sourceChatId) } : {}),
    };
    const saved = await handleBookmark({
      type,
      source: "chat",
      content,
      metadata: referenceMetadata,
    });
    if (saved) {
      setMessages((current) => current.map((item) => String(item._id) === String(message._id) ? { ...item, isBookmarked: true } : item));
      toast.success("Message saved to Knowledge Library");
    }
    return saved;
  }, [activeChat?._id, handleBookmark, setMessages]);

  const TONE_EMOJIS = {
    professional: "💼",
    casual: "😊",
    romantic: "❤️",
    humorous: "😂",
    custom: "🎭",
  };

  if (!user) return null;

  const rightPanelContent = chatStoryViewer ? (
    <StoryViewer
      stories={chatStoryViewer.stories}
      initialIndex={chatStoryViewer.initialIndex}
      user={user}
      chats={chats}
      embedded
      onClose={() => {
        setChatStoryViewer(null);
        setShowRightPanel(false);
      }}
      onChanged={() => {
        setChatStoryViewer(null);
        setShowRightPanel(false);
      }}
    />
  ) : showDecideFlow ? (
    <DecideFlow
      chatId={activeChat?._id}
      onClose={() => {
        setShowDecideFlow(false);
        setShowRightPanel(false);
      }}
    />
  ) : showAIPanel ? (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border dark:border-border-dark">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-primary dark:bg-primary-dark flex items-center justify-center text-white text-[10px] font-bold">
            AI
          </div>
          <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
            AI Assistant
          </h3>
        </div>
        <button
          onClick={() => setShowAIPanel(false)}
          className="p-1.5 rounded-lg hover:bg-hover/[0.07] dark:hover:bg-hover-dark/[0.07] text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark transition-colors"
          aria-label="Close AI suggestions"
          type="button"
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
        </button>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-glass">
        <SuggestionPanel
          suggestions={suggestions}
          onSend={handleSendMessage}
          chatId={activeChat._id}
          onBookmark={handleBookmark}
        />
      </div>
    </div>
  ) : showBookmarks ? (
    <BookmarksPanel userId={user._id} onSendBookmark={handleSendBookmark} onClose={() => setShowBookmarks(false)} />
  ) : (
    <RightPanel
      chat={activeChat}
      userId={user._id}
      onlineUsers={onlineUsers}
      onClose={() => {
        setShowRightPanel(false);
        setShowAIPanel(false);
      }}
      onOpenSilentInbox={() => {
        setShowSilentInbox(true);
        setShowRightPanel(false);
      }}
      onOpenGhostSession={() =>
        activeChat && handleStartGhostSession("whiteboard")
      }
      onOpenDecideFlow={handleOpenDecideFlow}
      onOpenPersona={() => setShowPersonaModal(true)}
    />
  );

  return (
    <>
      <SEO
        title={activeChat?.name || "Dashboard"}
        description={`Emotune chat dashboard - ${activeChat?.name ? `Chatting in ${activeChat.name}` : "Select a conversation to start chatting with AI-powered features"}`}
        canonical={`https://emotune.app${activeChat ? `/app/chat/${activeChat._id}` : "/app"}`}
        noIndex
      />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(webPageSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(SoftwareApplicationSchema())}
        </script>
      </Helmet>

      <div className="flex h-screen min-h-0 gap-1 overflow-hidden bg-background dark:bg-background-dark p-1">
        <AnimatePresence>
          {(showSidebar || window.innerWidth >= 1024) && (
            <aside
              className="w-sidebar flex-shrink-0 hidden overflow-hidden rounded-2xl border border-border bg-surface dark:border-border-dark dark:bg-surface-dark lg:flex flex-col"
              aria-label="Chat sidebar"
            >
              <Sidebar
                user={user}
                chats={chats}
                activeChat={activeChat}
                onSelectChat={handleSelectChat}
                loadingChats={loadingChats}
                silentInboxCount={silentInboxCount}
                onOpenGroupModal={() => setShowGroupModal(true)}
                onOpenThemeSwitcher={() =>
                  setShowThemeSwitcher(!showThemeSwitcher)
                }
                onLogout={logout}
                onOpenBookmarks={() => setShowBookmarks(!showBookmarks)}
                onOpenSettings={() => setShowSettings(true)}
                onOpenNewChat={() => setShowNewChat(true)}
                onOpenSilentInbox={() => setShowSilentInbox(true)}
                onOpenStory={handleOpenStoryPanel}
                onlineUsers={onlineUsers}
                onUpdateChatPreference={handleUpdateChatPreference}
                onMarkAllChatsRead={handleMarkAllChatsRead}
              />
            </aside>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showSidebar && window.innerWidth < 1024 && (
            <motion.div
              className="fixed inset-0 z-40 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
            <motion.div
              className="absolute inset-0 bg-black/60"
              onClick={() => setShowSidebar(false)}
              aria-label="Close sidebar"
              role="button"
              tabIndex={0}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.aside
              className="absolute bottom-0 left-0 top-0 w-sidebar overflow-hidden rounded-r-2xl border-r border-border bg-surface dark:border-border-dark dark:bg-surface-dark shadow-floating dark:shadow-floating-dark"
              aria-label="Chat sidebar"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 360, damping: 34 }}
            >
              <Sidebar
                user={user}
                chats={chats}
                activeChat={activeChat}
                onSelectChat={(chat) => {
                  handleSelectChat(chat);
                  setShowSidebar(false);
                }}
                loadingChats={loadingChats}
                silentInboxCount={silentInboxCount}
                onOpenGroupModal={() => setShowGroupModal(true)}
                onOpenThemeSwitcher={() =>
                  setShowThemeSwitcher(!showThemeSwitcher)
                }
                onLogout={logout}
                onOpenBookmarks={() => setShowBookmarks(!showBookmarks)}
                onOpenSettings={() => setShowSettings(true)}
                onOpenNewChat={() => setShowNewChat(true)}
                onOpenSilentInbox={() => {
                  setShowSilentInbox(true);
                  setShowSidebar(false);
                }}
                onOpenStory={() => {
                  handleOpenStoryPanel();
                  setShowSidebar(false);
                }}
                onlineUsers={onlineUsers}
                onUpdateChatPreference={handleUpdateChatPreference}
                onMarkAllChatsRead={handleMarkAllChatsRead}
              />
            </motion.aside>
            </motion.div>
          )}
        </AnimatePresence>

        <main className="app-main-shell flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-surface dark:border-border-dark dark:bg-surface-dark pb-16 lg:pb-0">
          <Navbar
            activeChat={activeChat}
            isOnline={
              activeChat
                ? isUserOnline(
                    activeChat.participants?.find(
                      (p) => p.user?._id !== user._id,
                    )?.user?._id,
                  )
                : false
            }
            isTyping={isTyping}
            onToggleSidebar={() => setShowSidebar(!showSidebar)}
            onToggleRightPanel={() => setShowRightPanel(!showRightPanel)}
            onOpenBookmarks={() => setShowBookmarks(!showBookmarks)}
            onToggleSilent={() => setIsSilent(!isSilent)}
            isSilent={isSilent}
            onOpenAIPanel={() => setShowAIPanel(!showAIPanel)}
            onOpenPersona={() => setShowPersonaModal(true)}
            onOpenGhostSession={handleStartGhostSession}
            onOpenDecideFlow={handleOpenDecideFlow}
          />

          <AnimatePresence mode="wait" initial={false}>
          {showStoryPanel ? (
            <motion.div
              key="stories-panel"
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <div className="min-h-0 flex-1 overflow-y-auto">
                <StoryFeed user={user} chats={chats} socket={socket} onClose={() => setShowStoryPanel(false)} />
              </div>
            </motion.div>
          ) : (
            <>
              {activeChat ? (
                <div className="flex min-h-0 min-w-0 flex-1">
                  <div className="app-chat-column flex min-h-0 min-w-0 flex-1 flex-col">
                    <div
                      className={`relative shrink-0 ${intentFilterExpanded ? "" : "h-8"}`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setIntentFilterExpanded((expanded) => !expanded)
                        }
                        className="group absolute left-0 top-0 z-30 flex h-8 w-6 cursor-pointer items-start justify-center pt-1 focus-visible:outline-none"
                        aria-label={
                          intentFilterExpanded
                            ? "Hide intent filters"
                            : "Show intent filters"
                        }
                        aria-expanded={intentFilterExpanded}
                        title={
                          intentFilterExpanded
                            ? "Hide intent filters"
                            : "Show intent filters"
                        }
                      >
                        <span
                          aria-hidden="true"
                          className="h-[35px] w-[4px] hover:h-[38px] hover:w-[6px] rounded-full bg-primary/80 dark:bg-primary-dark/80 group-hover:bg-primary dark:group-hover:bg-primary-dark mr-5 hover:mr-4 transition-all duration-200"
                        />
                      </button>
                      <AnimatePresence initial={false}>
                        {intentFilterExpanded && (
                          <motion.div
                            key="intent-filter-bar"
                            className="overflow-hidden"
                            style={{ transformOrigin: "left center" }}
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: "100%", opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                          >
                            <HorizontalIntentFilter
                              activeIntent={activeIntent}
                              onFilter={handleIntentFilter}
                              counts={intentCounts}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <ChatScreen
                      messages={messages}
                      loading={loadingMessages}
                      userId={user._id}
                      activeChat={activeChat}
                      onReply={handleReply}
                      onEdit={handleEdit}
                      onDeleteForMe={handleDeleteForMe}
                      onDeleteForEveryone={handleDeleteForEveryone}
                      onPin={handlePin}
                      onUnpin={handleUnpin}
                      onForward={(msg) => {
                        setForwardMessage(msg);
                        setShowForwardModal(true);
                      }}
                      onShowInfo={handleShowInfo}
                      onReact={handleReact}
                      onBookmark={handleBookmarkMessage}
                      onOpenStory={handleOpenStoryFromMessage}
                      pinnedMessages={activeChat?.pinnedMessages || []}
                      currentUserAvatar={
                        user?.profileImage ||
                        user?.profile_image ||
                        user?.avatar ||
                        user?.photo ||
                        ""
                      }
                    />
                    <MessageInput
                      chatId={activeChat?._id}
                      onSend={handleSendMessage}
                      onTyping={handleTyping}
                      isSilent={isSilent}
                      replyTo={replyToMessage}
                      editingMessage={editingMessage}
                      onCancelReply={cancelReply}
                      onCancelEdit={cancelEdit}
                    />
                  </div>
                </div>
              ) : (
                <div
                  className="flex-1 flex items-center justify-center"
                  aria-live="polite"
                >
                  {showIntroVideo ? (
                    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-surface/20 dark:bg-surface-dark/20">
                      <video
                        src="/assets/emotune-logo-intro.mp4"
                        autoPlay
                        muted
                        playsInline
                        preload="auto"
                        onPlay={() => {
                          try {
                            window.sessionStorage.setItem(
                              "emotune-logo-intro-played",
                              "true",
                            );
                          } catch {
                            // Continue playback without persistence when storage is unavailable.
                          }
                        }}
                        onEnded={finishIntroVideo}
                        onError={finishIntroVideo}
                        className="h-full w-full object-contain"
                        aria-label="Emotune logo animation"
                      />
                      <button
                        type="button"
                        onClick={finishIntroVideo}
                        className="absolute bottom-5 right-5 rounded-lg border border-border/30 dark:border-border-dark/30 bg-surface/75 dark:bg-surface-dark/75 px-3 py-2 text-xs text-text-secondary dark:text-text-secondary-dark backdrop-blur-glass hover:bg-hover/[0.08] dark:hover:bg-hover-dark/[0.08] hover:text-text-primary dark:hover:text-text-primary-dark"
                      >
                        Skip intro
                      </button>
                    </div>
                  ) : (
                    <motion.div
                      initial={{}}
                      animate={{}}
                      className="flex max-w-2xl flex-col items-center px-6 text-center"
                    >
                      <div
                        className="mb-8 flex h-56 w-56 items-center justify-center"
                        aria-hidden="true"
                      >
                        <img
                          src="/logo.png"
                          alt=""
                          className="h-full w-full object-contain drop-shadow-2xl"
                        />
                      </div>
                      <h2 className="mb-3 text-3xl font-semibold tracking-tight text-text-primary dark:text-text-primary-dark sm:text-4xl">
                        Your conversations start here
                      </h2>
                      <p className="mb-8 max-w-xl text-base leading-relaxed text-text-secondary dark:text-text-secondary-dark sm:text-lg">
                        Select a chat from the list to start messaging or create
                        a new conversation.
                      </p>
                      <Button
                        variant="primary"
                        size="lg"
                        icon={FiEdit3}
                        className="w-56 max-w-full text-xl"
                        onClick={() => setShowNewChat(true)}
                      >
                        Start a new chat
                      </Button>
                    </motion.div>
                  )}
                </div>
              )}
            </>
          )}
          </AnimatePresence>
        </main>

        <AnimatePresence>
          {(showRightPanel || showBookmarks || showAIPanel || showDecideFlow) &&
            window.innerWidth >= 1024 && (
              <motion.aside
                className="relative w-right-panel flex-shrink-0 hidden overflow-hidden rounded-2xl border border-border bg-surface dark:border-border-dark dark:bg-surface-dark backdrop-blur-glass lg:flex flex-col"
                initial={{ opacity: 0, x: 28 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 28 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                  mass: 0.8,
                }}
                aria-label="Side panel"
              >
                {rightPanelContent}
              </motion.aside>
            )}
        </AnimatePresence>

        <AnimatePresence>
          {(showRightPanel || showBookmarks || showAIPanel || showDecideFlow) &&
            window.innerWidth < 1024 && (
              <motion.div
                className="fixed inset-0 z-40 lg:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <motion.div
                  className="absolute inset-0 bg-black/55"
                  onClick={() => {
                    setShowRightPanel(false);
                    setShowBookmarks(false);
                    setShowAIPanel(false);
                    setShowDecideFlow(false);
                  }}
                  aria-label="Close panel"
                  role="button"
                  tabIndex={0}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
                <motion.aside
                  className="absolute right-0 top-0 bottom-0 w-[min(92vw,380px)] bg-surface dark:bg-surface-dark backdrop-blur-glass border-l border-border dark:border-border-dark shadow-floating dark:shadow-floating-dark flex flex-col"
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", stiffness: 320, damping: 34 }}
                  aria-label="Side panel"
                >
                  {rightPanelContent}
                </motion.aside>
              </motion.div>
            )}
        </AnimatePresence>

        <nav
          className="fixed bottom-0 left-0 right-0 h-16 lg:hidden z-30 flex items-center justify-around px-2 bg-surface dark:bg-surface-dark backdrop-blur-glass border-t border-border dark:border-border-dark shadow-floating dark:shadow-floating-dark"
          aria-label="Mobile navigation"
        >
          <button
            onClick={() => setShowSidebar(true)}
            className="flex flex-col items-center gap-0.5 text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark transition-colors py-1 px-3 rounded-xl"
            aria-label="Chats"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="text-[10px] font-medium">Chats</span>
          </button>
          <button
            onClick={() => (window.location.href = "/app/memory")}
            className="flex flex-col items-center gap-0.5 text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark transition-colors py-1 px-3 rounded-xl"
            aria-label="Memory search"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <span className="text-[10px] font-medium">Memory</span>
          </button>
          <button
            onClick={() => setShowSilentInbox(true)}
            className="flex flex-col items-center gap-0.5 text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark transition-colors py-1 px-3 rounded-xl relative"
            aria-label={`Silent inbox${silentInboxCount > 0 ? `, ${silentInboxCount} unread` : ""}`}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span className="text-[10px] font-medium">Silent</span>
            {silentInboxCount > 0 && (
              <span className="absolute -top-0.5 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary dark:bg-primary-dark text-white text-[9px] font-bold flex items-center justify-center shadow-lg">
                {silentInboxCount > 99 ? "99+" : silentInboxCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowRightPanel(!showRightPanel)}
            className="flex flex-col items-center gap-0.5 text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark transition-colors py-1 px-3 rounded-xl"
            aria-label="Profile"
          >
            <div className="w-5 h-5 rounded-full bg-primary dark:bg-primary-dark flex items-center justify-center text-white text-[8px] font-bold overflow-hidden">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                user?.username?.[0]?.toUpperCase() || "U"
              )}
            </div>
            <span className="text-[10px] font-medium">Profile</span>
          </button>
        </nav>
      </div>

      <AnimatePresence>
        {showGroupModal && (
          <GroupModal
            onClose={() => setShowGroupModal(false)}
            onCreate={(group) => {
              setShowGroupModal(false);
              fetchChats();
              toast.success("Group created!");
            }}
          />
        )}
        {showThemeSwitcher && (
          <ThemeSwitcher
            currentTheme={theme}
            onSelect={setTheme}
            onClose={() => setShowThemeSwitcher(false)}
          />
        )}
        {showSettings && <Settings onClose={() => setShowSettings(false)} />}
        {showNewChat && (
          <NewChatModal
            onClose={() => setShowNewChat(false)}
            onSelectChat={(chat) => {
              setShowNewChat(false);
              handleSelectChat(chat);
              setShowSidebar(false);
              fetchChats();
            }}
          />
        )}
        {showForwardModal && forwardMessage && (
          <ForwardModal
            message={forwardMessage}
            onForward={handleForward}
            onClose={() => {
              setShowForwardModal(false);
              setForwardMessage(null);
            }}
          />
        )}
        {messageInfo && (
          <MessageInfoModal
            message={messageInfo}
            userId={user._id}
            onClose={() => setMessageInfo(null)}
          />
        )}
        {showSilentInbox && (
          <SilentInboxModal
            onClose={() => setShowSilentInbox(false)}
            onAccept={handleAcceptSilent}
            totalUnread={silentInboxCount}
          />
        )}

        {showGhostSession && ghostSession && activeChat && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{}}
            animate={{}}
            exit={{}}
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={handleCloseGhostSession}
            />
            <motion.div
              className="relative w-full max-w-4xl h-[80vh]"
              initial={{}}
              animate={{}}
              exit={{}}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center text-sm text-text-secondary dark:text-text-secondary-dark">
                    Loading Ghost Session...
                  </div>
                }
              >
                <GhostCollaboration
                  session={ghostSession}
                  onClose={handleCloseGhostSession}
                  socket={socket}
                  chatId={activeChat._id}
                />
              </Suspense>
            </motion.div>
          </motion.div>
        )}

        {showPersonaModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{}}
            animate={{}}
            exit={{}}
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowPersonaModal(false)}
              aria-label="Close persona selector"
              role="button"
              tabIndex={0}
            />
            <motion.div
              className="relative p-6 w-full max-w-sm mx-4 bg-surface dark:bg-surface-dark backdrop-blur-glass border border-border dark:border-border-dark rounded-2xl shadow-floating dark:shadow-floating-dark"
              initial={{}}
              animate={{}}
              exit={{}}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              role="dialog"
              aria-label="Select persona"
              aria-modal="true"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
                    Select Persona
                  </h3>
                  <p className="text-[10px] text-text-secondary dark:text-text-secondary-dark mt-0.5">
                    Choose an AI persona for your chat
                  </p>
                </div>
                <button
                  onClick={() => setShowPersonaModal(false)}
                  className="p-1.5 rounded-lg hover:bg-hover/[0.07] dark:hover:bg-hover-dark/[0.07] text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark transition-colors"
                  aria-label="Close persona selector"
                  type="button"
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
                </button>
              </div>
              <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto scrollbar-glass">
                <motion.button
                  onClick={() => {
                    clearActivePersona();
                    setShowPersonaModal(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-3 text-sm rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-focus dark:focus:ring-focus-dark ${!activePersona ? "bg-primary/10 dark:bg-primary-dark/10 border border-primary/30 dark:border-primary-dark/30 text-primary dark:text-primary-dark" : "text-text-secondary dark:text-text-secondary-dark hover:bg-hover/[0.07] dark:hover:bg-hover-dark/[0.07] border border-transparent"}`}
                  aria-pressed={!activePersona}
                  type="button"
                >
                  <div
                    className="w-9 h-9 rounded-xl bg-surface dark:bg-surface-dark backdrop-blur-glass border border-border dark:border-border-dark flex items-center justify-center text-base"
                    aria-hidden="true"
                  >
                    👤
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="font-medium truncate">Default (No Persona)</p>
                    <p className="text-[10px] opacity-60">Standard chat mode</p>
                  </div>
                  {!activePersona && (
                    <div className="w-5 h-5 rounded-full bg-primary dark:bg-primary-dark flex items-center justify-center">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="3"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </div>
                  )}
                </motion.button>
                {personas.length === 0 && (
                  <p className="px-3 py-3 text-xs text-text-secondary dark:text-text-secondary-dark text-center">
                    No personas yet. Create one in settings.
                  </p>
                )}
                {personas.map((persona) => (
                  <motion.button
                    key={persona._id}
                    onClick={() => {
                      setActivePersona(persona._id);
                      setShowPersonaModal(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-3 text-sm rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-focus dark:focus:ring-focus-dark ${activePersona?._id === persona._id ? "bg-primary/10 dark:bg-primary-dark/10 border border-primary/30 dark:border-primary-dark/30 text-primary dark:text-primary-dark" : "text-text-secondary dark:text-text-secondary-dark hover:bg-hover/[0.07] dark:hover:bg-hover-dark/[0.07] border border-transparent"}`}
                    aria-pressed={activePersona?._id === persona._id}
                    type="button"
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold"
                      style={{
                        background: persona.color || "#3B5BFF",
                        color: "#fff",
                      }}
                      aria-hidden="true"
                    >
                      {persona.name[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <p className="font-medium truncate">{persona.name}</p>
                      <p className="text-[10px] opacity-60 capitalize">
                        {persona.tone} tone
                      </p>
                    </div>
                    {activePersona?._id === persona._id && (
                      <div className="w-5 h-5 rounded-full bg-primary dark:bg-primary-dark flex items-center justify-center">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="white"
                          strokeWidth="3"
                        >
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default memo(Dashboard);
