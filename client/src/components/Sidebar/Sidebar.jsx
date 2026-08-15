import { useLayoutEffect, useMemo, useRef, useState, memo } from "react";
import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import {
  FiArchive,
  FiBell,
  FiBookmark,
  FiCamera,
  FiCheckCircle,
  FiChevronDown,
  FiChevronRight,
  FiClock,
  FiCopy,
  FiGrid,
  FiInfo,
  FiLayers,
  FiLogOut,
  FiMenu,
  FiMessageCircle,
  FiMoreHorizontal,
  FiPlus,
  FiRepeat,
  FiSearch,
  FiSettings,
  FiShield,
  FiSliders,
  FiStar,
  FiUser,
  FiX,
  FiUsers,
  FiVolumeX,
  FiZap,
} from "react-icons/fi";
import { MdOutlinePushPin, MdDeleteForever } from "react-icons/md";
import { chatService, messageService, userService } from "../../services/api";
import { LuSmilePlus } from "react-icons/lu";
import { FaUserPlus } from "react-icons/fa6";
import { FaUsers } from "react-icons/fa";
import { cn } from "../../theme/utilities";

const filters = [
  { id: "all", label: "All", icon: FiBell },
  { id: "unread", label: "Unread", icon: FiMessageCircle },
  { id: "groups", label: "Groups", icon: FiUsers },
  { id: "ai", label: "AI", icon: FiZap },
  { id: "pinned", label: "Pinned", icon: MdOutlinePushPin },
];

function SolidAvatar({ src, name, size = "md", status, kind }) {
  const sizes = {
    sm: "h-9 w-9 text-xs",
    md: "h-11 w-11 text-sm",
    lg: "h-16 w-16 text-lg",
  };
  const initials = (name || "?")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const background =
    kind === "ai"
      ? "bg-ai/14 text-ai"
      : kind === "ghost"
        ? "bg-ghost/14 text-ghost"
        : kind === "memory"
          ? "bg-memory/14 text-memory"
          : "bg-surface-elevated text-text-primary";
  return (
    <span
      className="relative inline-flex shrink-0"
      aria-label={name || "Avatar"}
    >
      <span
        className={cn(
          sizes[size],
          "flex items-center justify-center overflow-hidden rounded-full font-semibold",
          background,
        )}
      >
        {src ? (
          <img
            src={src}
            alt={name || "Avatar"}
            className="h-full w-full object-cover"
          />
        ) : kind === "ai" ? (
          <FiZap size={size === "lg" ? 25 : 18} />
        ) : kind === "ghost" ? (
          <FiShield size={size === "lg" ? 25 : 18} />
        ) : kind === "memory" ? (
          <MdDeleteForever size={size === "lg" ? 25 : 18} />
        ) : (
          initials
        )}
      </span>
      {status && (
        <span
          className={cn(
            "absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-surface",
            status === "online" ? "bg-online" : "bg-offline",
          )}
          aria-label={status}
        />
      )}
    </span>
  );
}

function SmallIconButton({
  label,
  children,
  onClick,
  ariaExpanded,
  active = false,
  className = "",
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={ariaExpanded}
      title={label}
      onClick={onClick}
      className={cn(
        "interactive flex h-9 w-9 items-center justify-center rounded-full border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50",
        active
          ? "border-primary bg-primary text-on-primary"
          : "border-border/20 bg-surface/70 text-text-primary",
        className,
      )}
    >
      {children}
    </button>
  );
}

function Badge({ children, tone = "blue" }) {
  return (
    <span
      className={cn(
        "inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 pt-[2px] text-[10px] font-bold",
        tone === "blue" ? "bg-primary/50 text-on-primary" : "bg-ai/14 text-ai",
      )}
    >
      {children}
    </span>
  );
}

function Sidebar({
  user,
  chats,
  activeChat,
  onSelectChat,
  loadingChats,
  silentInboxCount,
  onOpenGroupModal,
  onOpenThemeSwitcher,
  onLogout,
  onOpenBookmarks,
  onOpenSettings,
  onOpenNewChat,
  onOpenSilentInbox,
  onOpenStory,
  onlineUsers = new Set(),
  onUpdateChatPreference,
  onMarkAllChatsRead,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [openChatMenuId, setOpenChatMenuId] = useState(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [availabilityMenuOpen, setAvailabilityMenuOpen] = useState(false);
  const [availability, setAvailability] = useState(user?.status || "online");
  const [profileMenuPosition, setProfileMenuPosition] = useState({
    top: 0,
    left: 0,
  });
  const [showQrCode, setShowQrCode] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const profileMenuAnchorRef = useRef(null);
  const listRef = useRef(null);

  const profileLink = `${window.location.origin}/profile/${user?._id || user?.id || "me"}`;

  const updateProfileMenuPosition = () => {
    const anchor = profileMenuAnchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const menuWidth = 220;
    const left = Math.min(
      Math.max(8, rect.right - menuWidth),
      Math.max(8, window.innerWidth - menuWidth - 8),
    );
    setProfileMenuPosition({ top: rect.bottom + 8, left });
  };

  useLayoutEffect(() => {
    if (!profileMenuOpen) return undefined;
    updateProfileMenuPosition();
    const handleViewportChange = () => updateProfileMenuPosition();
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [profileMenuOpen]);

  const availabilityOptions = [
    { id: "online", label: "Online", tone: "bg-online" },
    { id: "away", label: "Away", tone: "bg-warning" },
    { id: "busy", label: "Busy", tone: "bg-danger" },
    { id: "offline", label: "Invisible", tone: "bg-offline" },
  ];

  const handleAvailabilityChange = async (status) => {
    const previousStatus = availability;
    setAvailability(status);
    setAvailabilityMenuOpen(false);
    try {
      await userService.updateStatus(status);
    } catch {
      setAvailability(previousStatus);
    }
  };

  const handleCopyProfileLink = async () => {
    try {
      await navigator.clipboard.writeText(profileLink);
      toast.success("Profile link copied");
    } catch {
      toast.error("Could not copy profile link");
    }
    setProfileMenuOpen(false);
  };

  const handleMarkAllChatsRead = async () => {
    try {
      await messageService.markAllRead();
      onMarkAllChatsRead?.();
      toast.success("All chats marked as read");
    } catch (error) {
      toast.error(
        error.response?.data?.error || "Could not mark chats as read",
      );
    }
    setProfileMenuOpen(false);
  };

  const chatSearchQuery = useQuery({
    queryKey: ["chat-search", searchQuery.trim()],
    queryFn: ({ signal }) =>
      chatService
        .search(searchQuery.trim(), { signal })
        .then(({ data }) => data.chats || []),
    enabled: searchQuery.trim().length >= 2,
    staleTime: 30_000,
  });

  const sourceChats =
    searchQuery.trim().length >= 2 ? chatSearchQuery.data || [] : chats;
  const filteredChats = useMemo(
    () =>
      sourceChats.filter((chat) => {
        const name =
          chat.name ||
          chat.participants?.find((p) => p.user?._id !== user?._id)?.user
            ?.username ||
          "Unknown";
        const matchesSearch = name
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
        const matchesFilter =
          activeFilter === "all" ||
          (activeFilter === "unread" && chat.unreadCount > 0) ||
          (activeFilter === "groups" && chat.type === "group") ||
          (activeFilter === "ai" && (chat.type === "ai_chat" || chat.isAI)) ||
          (activeFilter === "pinned" && chat.isPinned) ||
          (activeFilter === "archived" && chat.isArchived);
        return (
          matchesSearch &&
          matchesFilter &&
          (activeFilter === "archived" || !chat.isArchived) &&
          (!showPinnedOnly || chat.isPinned)
        );
      }),
    [sourceChats, searchQuery, activeFilter, showPinnedOnly, user?._id],
  );

  const virtualRange = useMemo(() => {
    const rowHeight = 76;
    const overscan = 5;
    const start = Math.max(
      0,
      Math.floor(Math.max(0, scrollTop - 30) / rowHeight) - overscan,
    );
    const visibleCount =
      Math.ceil((listRef.current?.clientHeight || 600) / rowHeight) +
      overscan * 2;
    return {
      start,
      end: Math.min(filteredChats.length, start + visibleCount),
      rowHeight,
    };
  }, [filteredChats.length, scrollTop]);

  const getChatName = (chat) =>
    chat.type === "group"
      ? chat.name
      : chat.participants?.find((p) => p.user?._id !== user?._id)?.user
          ?.username || "Unknown";
  const getOtherUser = (chat) =>
    chat.participants?.find((p) => p.user?._id !== user?._id)?.user;
  const getChatAvatar = (chat) =>
    chat.type === "group" ? chat.avatar : getOtherUser(chat)?.avatar;
  const getKind = (chat) =>
    chat.type === "ai_chat" || chat.isAI
      ? "ai"
      : chat.type === "ghost"
        ? "ghost"
        : chat.type === "memory"
          ? "memory"
          : undefined;
  const getPreview = (chat) => {
    if (!chat.lastMessage) return "No messages yet";
    const prefix = chat.lastMessage.sender?._id === user?._id ? "You: " : "";
    return `${prefix}${chat.lastMessage.content || "Shared media"}`;
  };
  const getTime = (chat) =>
    chat.lastMessage?.createdAt
      ? new Date(chat.lastMessage.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";
  const unreadTotal = chats.reduce(
    (total, chat) => total + (chat.unreadCount || 0),
    0,
  );

  const updatePreference = (event, chat, preference) => {
    event.stopPropagation();
    onUpdateChatPreference?.(chat, preference);
  };

  return (
    <aside
      className="relative flex h-full w-full flex-col overflow-hidden text-text-primary"
      aria-label="Chat sidebar"
    >
      <div className="shrink-0">
        <div className="mb-1 border-b border-border/20 bg-surface/55 px-3 py-2 backdrop-blur-glass">
          <div className="flex items-center gap-3">
            <SolidAvatar src={user?.avatar} name={user?.username} size="md" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-[16px] font-bold">
                  {user?.fullName || "User"}
                </h2>
                {user?.isVerified && (
                  <FiShield
                    size={13}
                    className="text-primary"
                    aria-label="Verified"
                  />
                )}
              </div>
              <p className="truncate text-xs text-text-secondary">
                {user?.username ? `@${user.username}` : "No username"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <SmallIconButton
                label={`Notifications${silentInboxCount ? `, ${silentInboxCount} unread` : ""}`}
                onClick={onOpenSilentInbox}
              >
                <span className="relative">
                  <FiBell size={18} />
                  <span className="absolute -right-0 -top-0.5 h-2 w-2 rounded-full bg-primary" />
                </span>
              </SmallIconButton>
              <div ref={profileMenuAnchorRef} className="relative">
                <SmallIconButton
                  label="More options"
                  ariaExpanded={profileMenuOpen}
                  onClick={() => {
                    setProfileMenuOpen((open) => !open);
                    setAvailabilityMenuOpen(false);
                  }}
                >
                  <FiMoreHorizontal size={19} />
                </SmallIconButton>

                {profileMenuOpen &&
                  typeof document !== "undefined" &&
                  createPortal(
                    <>
                      <button
                        type="button"
                        aria-label="Close profile menu"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          setAvailabilityMenuOpen(false);
                        }}
                        className="fixed inset-0 z-[90] cursor-default"
                      />
                      <div
                        role="menu"
                        aria-label="Profile actions"
                        style={{
                          top: profileMenuPosition.top,
                          left: profileMenuPosition.left,
                        }}
                        className="glass-popover fixed z-[100] min-w-[220px] rounded-xl border border-border/30 p-1.5 text-text-secondary shadow-floating"
                      >
                        <div className="relative">
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() =>
                              setAvailabilityMenuOpen((open) => !open)
                            }
                            className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-xs hover:bg-hover/[0.08] hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50"
                          >
                            <span className="flex items-center gap-2">
                              <FiCheckCircle size={14} />
                              Set Availability
                            </span>
                            <span className="flex items-center gap-1 text-[10px] capitalize text-text-muted">
                              <span
                                className={cn(
                                  "h-2 w-2 rounded-full",
                                  availabilityOptions.find(
                                    (option) => option.id === availability,
                                  )?.tone || "bg-offline",
                                )}
                              />
                              {availability}
                            </span>
                          </button>

                          {availabilityMenuOpen && (
                            <div className="glass-popover absolute left-full top-0 mr-2 min-w-[130px] rounded-lg border border-border/30 p-1 shadow-floating">
                              {availabilityOptions.map((option) => (
                                <button
                                  key={option.id}
                                  type="button"
                                  role="menuitem"
                                  onClick={() =>
                                    handleAvailabilityChange(option.id)
                                  }
                                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs capitalize hover:bg-hover/[0.08] hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50"
                                >
                                  <span
                                    className={cn(
                                      "h-2 w-2 rounded-full",
                                      option.tone,
                                    )}
                                  />
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          role="menuitem"
                          onClick={onLogout}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-hover/[0.08] hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50"
                        >
                          <FiRepeat size={14} />
                          Switch Account
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setShowQrCode(true);
                            setProfileMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-hover/[0.08] hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50"
                        >
                          <FiUser size={14} />
                          My QR Code
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={handleCopyProfileLink}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-hover/[0.08] hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50"
                        >
                          <FiCopy size={14} />
                          Copy Profile Link
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={handleMarkAllChatsRead}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-hover/[0.08] hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50"
                        >
                          <FiCheckCircle size={14} />
                          Mark All Chats as Read
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setActiveFilter("archived");
                            setProfileMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-hover/[0.08] hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50"
                        >
                          <FiArchive size={14} />
                          Archived Chats
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setProfileMenuOpen(false);
                            onOpenSettings?.();
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-hover/[0.08] hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50"
                        >
                          <FiSliders size={14} />
                          Keyboard Shortcuts
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setShowWhatsNew(true);
                            setProfileMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-hover/[0.08] hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50"
                        >
                          <FiStar size={14} />
                          What&apos;s New
                        </button>
                        <div className="my-1 border-t border-border/20" />
                        <button
                          type="button"
                          role="menuitem"
                          onClick={onLogout}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-danger/90 hover:bg-danger/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50"
                        >
                          <FiLogOut size={14} />
                          Logout
                        </button>
                      </div>
                    </>,
                    document.body,
                  )}
              </div>
            </div>
          </div>
        </div>

        <div className="relative mb-2 px-1">
          <FiSearch
            className="absolute left-4 top-1/2 -translate-y-1/2 text-text-primary"
            size={16}
          />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search conversations..."
            aria-label="Search conversations"
            className="glass-input h-10 w-full rounded-2xl pl-10 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/35"
          />
        </div>

        <div
          className="flex gap-2 overflow-x-auto pb-1 px-2 scrollbar-hide"
          aria-label="Conversation filters"
        >
          {filters.map(({ id, label, icon: Icon }) => {
            const active = activeFilter === id;
            const count = id === "unread" ? unreadTotal : 0;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setActiveFilter(id);
                  setShowPinnedOnly(id === "pinned");
                }}
                className={cn(
                  "interactive flex h-[27px] shrink-0 items-center justify-center pt-[1px] rounded-full border px-3 text-[11px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50",
                  active
                    ? "border-primary bg-primary text-on-primary"
                    : "border-border/20 bg-surface/70 text-text-primary",
                )}
              >
                {label}
                {count > 0 && <Badge>{count > 99 ? "99+" : count}</Badge>}
              </button>
            );
          })}
        </div>
      </div>

      <div
        ref={listRef}
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
        className="min-h-0 flex-1 overflow-y-auto px-2 mt-2 scrollbar-hide"
      >
        {loadingChats ? (
          <div className="space-y-2" aria-label="Loading chats">
            {[1, 2, 3, 4, 5].map((item) => (
              <div
                key={item}
                className="shimmer-bg h-[50px] rounded-lg border border-border/20"
              />
            ))}
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="glass-elevated rounded-xl p-6 text-center text-sm text-text-secondary">
            No conversations found.
          </div>
        ) : (
          <div
            style={{
              paddingTop: virtualRange.start * virtualRange.rowHeight,
              paddingBottom:
                Math.max(0, filteredChats.length - virtualRange.end) *
                virtualRange.rowHeight,
            }}
          >
            {filteredChats
              .slice(virtualRange.start, virtualRange.end)
              .map((chat) => {
                const otherUser = getOtherUser(chat);
                const isActive = activeChat?._id === chat._id;
                const kind = getKind(chat);
                return (
                  <button
                    key={chat._id}
                    type="button"
                    onClick={() => onSelectChat(chat)}
                    aria-selected={isActive}
                    className={cn(
                      "interactive group relative mb-[3px] flex h-[50px] w-full items-center gap-3 rounded-md px-2 text-left",
                      isActive
                        ? "border border-primary/20 bg-primary/20"
                        : "bg-primary/10",
                    )}
                  >
                    <SolidAvatar
                      src={getChatAvatar(chat)}
                      name={getChatName(chat)}
                      kind={kind}
                      status={
                        otherUser && onlineUsers.has(otherUser._id)
                          ? "online"
                          : undefined
                      }
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <strong className="truncate text-lg font-bold">
                            {getChatName(chat)}
                          </strong>
                          {kind === "ai" && (
                            <FiZap size={13} className="text-ai" />
                          )}
                          {chat.isPinned && (
                            <MdOutlinePushPin
                              size={12}
                              className="text-primary"
                            />
                          )}
                        </span>
                        <span className="shrink-0 text-[10px] text-text-muted">
                          {getTime(chat)}
                        </span>
                      </span>
                      <span className="-mt-0.5 flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "truncate text-[12px]",
                            chat.typingUsers?.length
                              ? "italic text-primary"
                              : "text-text-secondary",
                          )}
                        >
                          {chat.typingUsers?.length
                            ? "Typing..."
                            : getPreview(chat)}
                        </span>
                        {chat.unreadCount > 0 && (
                          <Badge>
                            {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                          </Badge>
                        )}
                      </span>
                    </span>
                    <span className="absolute right-2 top-1/2 z-20 h-8 w-8 -translate-y-1/2">
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label="Open chat actions"
                        aria-haspopup="menu"
                        aria-expanded={openChatMenuId === chat._id}
                        onClick={(event) => {
                          event.stopPropagation();
                          setOpenChatMenuId((current) =>
                            current === chat._id ? null : chat._id,
                          );
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            event.stopPropagation();
                            setOpenChatMenuId((current) =>
                              current === chat._id ? null : chat._id,
                            );
                          }
                        }}
                        className="hidden h-8 w-8 cursor-pointer items-center justify-center rounded-full text-text-secondary hover:bg-hover/[0.09] hover:text-text-primary group-hover:flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50"
                      >
                        <FiMoreHorizontal size={17} />
                      </span>

                      {openChatMenuId === chat._id && (
                        <span
                          role="menu"
                          aria-label="Chat actions"
                          onClick={(event) => event.stopPropagation()}
                          className="glass-popover absolute right-0 top-full mt-1 flex min-w-[140px] flex-col gap-0.5 rounded-md border border-border/30 py-0.5 text-text-secondary shadow-floating"
                        >
                          <span
                            role="menuitem"
                            tabIndex={0}
                            onClick={(event) => {
                              updatePreference(event, chat, {
                                isPinned: !chat.isPinned,
                              });
                              setOpenChatMenuId(null);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                updatePreference(event, chat, {
                                  isPinned: !chat.isPinned,
                                });
                                setOpenChatMenuId(null);
                              }
                            }}
                            className="flex cursor-pointer items-center gap-2 p-1.5 text-sm hover:bg-hover/[0.08] hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50"
                          >
                            <MdOutlinePushPin size={16} />
                            <span>
                              {chat.isPinned ? "Unpin chat" : "Pin chat"}
                            </span>
                          </span>
                          <span
                            role="menuitem"
                            tabIndex={0}
                            onClick={(event) => {
                              updatePreference(event, chat, {
                                isMuted: !chat.isMuted,
                              });
                              setOpenChatMenuId(null);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                updatePreference(event, chat, {
                                  isMuted: !chat.isMuted,
                                });
                                setOpenChatMenuId(null);
                              }
                            }}
                            className="flex cursor-pointer items-center gap-2 p-1.5 text-sm hover:bg-hover/[0.08] hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50"
                          >
                            <FiVolumeX size={16} />
                            <span>
                              {chat.isMuted ? "Unmute chat" : "Mute chat"}
                            </span>
                          </span>
                          <span
                            role="menuitem"
                            tabIndex={0}
                            onClick={(event) => {
                              updatePreference(event, chat, {
                                isArchived: true,
                              });
                              setOpenChatMenuId(null);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                updatePreference(event, chat, {
                                  isArchived: true,
                                });
                                setOpenChatMenuId(null);
                              }
                            }}
                            className="flex cursor-pointer items-center gap-2 p-1.5 text-sm text-danger/90 hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50"
                          >
                            <MdDeleteForever size={16} />
                            <span>Archive chat</span>
                          </span>
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
          </div>
        )}
      </div>

      <div className="shrink-0 px-2 pb-1.5 pt-2">
        <nav
          className="glass-elevated grid grid-cols-6 items-stretch gap-1 rounded-2xl p-1.5"
          aria-label="Sidebar navigation"
        >
          <button
            type="button"
            onClick={onOpenStory}
            title="Open stories"
            className="interactive flex items-center justify-center rounded-2xl px-1 py-1.5 text-text-secondary hover:bg-hover/[0.08] hover:text-text-primary"
            aria-label="Open stories"
          >
            <LuSmilePlus size={20} className="shrink-0" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onOpenNewChat}
            title="Invite user"
            className="interactive flex items-center justify-center rounded-2xl px-1 py-1.5 text-text-secondary hover:bg-hover/[0.08] hover:text-text-primary"
            aria-label="Invite user"
          >
            <FaUserPlus size={20} className="shrink-0 text-primary" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onOpenGroupModal}
            title="Create group"
            className="interactive flex items-center justify-center rounded-2xl px-1 py-1.5 text-text-secondary hover:bg-hover/[0.08] hover:text-text-primary"
            aria-label="Create group"
          >
            <FaUsers size={20} className="shrink-0 text-primary" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onOpenBookmarks}
            title="Open bookmarks"
            className="interactive flex items-center justify-center rounded-2xl px-1 py-1.5 text-text-secondary hover:bg-hover/[0.08] hover:text-text-primary"
            aria-label="Open bookmarks"
          >
            <FiBookmark size={20} className="shrink-0" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onOpenSilentInbox}
            title="Open AI inbox"
            className="interactive flex items-center justify-center rounded-2xl px-1 py-1.5 text-text-secondary hover:bg-hover/[0.08] hover:text-text-primary"
            aria-label="Open AI inbox"
          >
            <FiZap size={20} className="shrink-0" aria-hidden="true" />
            {silentInboxCount > 0 && (
              <span className="absolute right-1.5 top-1 h-2 w-2 rounded-full bg-primary" />
            )}
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            title="Open settings"
            className="iinteractive flex items-center justify-center rounded-2xl px-1 py-1.5 text-text-secondary hover:bg-hover/[0.08] hover:text-text-primary"
            aria-label="Open settings"
          >
            <FiSettings size={20} className="shrink-0" aria-hidden="true" />
          </button>
        </nav>
      </div>

      {showQrCode &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-qr-title"
          >
            <button
              type="button"
              className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-sm"
              onClick={() => setShowQrCode(false)}
              aria-label="Close QR code"
            />
            <div className="glass-dialog relative z-10 w-full max-w-sm rounded-2xl p-6 text-center text-text-primary">
              <button
                type="button"
                onClick={() => setShowQrCode(false)}
                className="absolute right-3 top-3 rounded-full p-1 text-text-secondary hover:bg-hover/[0.08]"
                aria-label="Close QR code"
              >
                <FiX size={18} />
              </button>
              <h2 id="profile-qr-title" className="text-lg font-semibold">
                My QR Code
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                Scan to open{" "}
                {user?.fullName || user?.username || "my Emotune profile"}.
              </p>
              <div className="mx-auto my-5 flex w-fit rounded-xl bg-white p-3 text-black">
                <QRCodeSVG value={profileLink} size={184} includeMargin />
              </div>
              <p className="break-all rounded-lg bg-surface/60 p-2 text-xs text-text-muted">
                {profileLink}
              </p>
              <button
                type="button"
                onClick={handleCopyProfileLink}
                className="mt-4 w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-on-primary hover:bg-primary-hover"
              >
                Copy Profile Link
              </button>
            </div>
          </div>,
          document.body,
        )}

      {showWhatsNew &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="whats-new-title"
          >
            <button
              type="button"
              className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-sm"
              onClick={() => setShowWhatsNew(false)}
              aria-label="Close What's New"
            />
            <div className="glass-dialog relative z-10 w-full max-w-md rounded-2xl p-6 text-text-primary">
              <button
                type="button"
                onClick={() => setShowWhatsNew(false)}
                className="absolute right-3 top-3 rounded-full p-1 text-text-secondary hover:bg-hover/[0.08]"
                aria-label="Close What's New"
              >
                <FiX size={18} />
              </button>
              <div className="flex items-center gap-3">
                <FiInfo className="text-primary" size={22} />
                <div>
                  <h2 id="whats-new-title" className="text-lg font-semibold">
                    What&apos;s New
                  </h2>
                  <p className="text-xs text-text-secondary">
                    Latest Emotune improvements
                  </p>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {[
                  [
                    "Chat actions",
                    "Pin, mute, archive, and restore conversations from the chat list.",
                  ],
                  [
                    "Availability",
                    "Set your presence from Online, Away, Busy, or Invisible.",
                  ],
                  [
                    "Profile sharing",
                    "Share your profile using a private link or QR code.",
                  ],
                ].map(([title, description]) => (
                  <div
                    key={title}
                    className="rounded-xl border border-border/25 bg-surface/45 p-3"
                  >
                    <p className="text-sm font-medium">{title}</p>
                    <p className="mt-1 text-xs text-text-secondary">
                      {description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </aside>
  );
}

export default memo(Sidebar);
