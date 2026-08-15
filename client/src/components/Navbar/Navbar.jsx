import { useState, useRef, useEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiMenu,
  FiInfo,
  FiBookmark,
  FiZap,
  FiUsers,
  FiSliders,
  FiMoon,
  FiUser,
  FiSearch,
  FiMoreVertical,
  FiStar,
  FiMessageSquare,
  FiPhone,
  FiVideo,
  FiShield,
  FiLayers,
  FiBarChart2,
} from "react-icons/fi";
import { TypingIndicator } from "../Loaders/Loader";
import { Avatar, StatusDot, Menu, MenuItem, IconButton, Divider } from "../ui";
import TextLogo from "../common/TextLogo";

function Navbar({
  activeChat,
  isOnline,
  isTyping,
  onToggleSidebar,
  onToggleRightPanel,
  onOpenBookmarks,
  onToggleSilent,
  isSilent,
  onOpenAIPanel,
  onOpenPersona,
  onOpenGhostSession,
  onOpenDecideFlow,
}) {
  const [showMore, setShowMore] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const menuRef = useRef(null);
  const actionsRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setShowMore(false);
      if (actionsRef.current && !actionsRef.current.contains(e.target))
        setShowQuickActions(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getChatName = () => {
    if (!activeChat) return "Emotune";
    if (activeChat.type === "group") return activeChat.name;
    if (activeChat.otherUser?.username) return activeChat.otherUser.username;
    const other = activeChat.participants?.find(
      (p) => p.user?._id !== activeChat._id,
    )?.user;
    return other?.username || activeChat.name || "Chat";
  };

  const getChatAvatar = () => {
    if (!activeChat) return null;
    if (activeChat.otherUser?.avatar) return activeChat.otherUser.avatar;
    const other = activeChat.participants?.find(
      (p) => p.user?._id !== activeChat._id,
    )?.user;
    return other?.avatar || null;
  };

  return (
    <header
      className="h-[55px] flex items-center justify-between px-4 flex-shrink-0 bg-surface backdrop-blur-glass border-b border-border"
      role="banner"
    >
      <div className="flex items-center gap-3 min-w-0">
        <IconButton
          icon={FiMenu}
          size="sm"
          onClick={onToggleSidebar}
          label="Toggle sidebar"
          className="lg:hidden"
        />

        {activeChat ? (
          <motion.div
            className="flex items-center gap-3 min-w-0"
            initial={{}}
            animate={{}}
          >
            <div className="relative flex-shrink-0">
              <Avatar
                src={getChatAvatar()}
                name={getChatName()}
                size="md"
                ring={
                  activeChat.type !== "group" && isOnline ? "success" : "none"
                }
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-[18px] font-semibold text-text-primary truncate">
                  {getChatName()}
                </h2>
                {activeChat.otherUser?.isVerified && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="var(--theme-primary)"
                    aria-label="Verified"
                    className="flex-shrink-0"
                  >
                    <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                )}
              </div>
              {isTyping ? (
                <div aria-live="polite" aria-label="Someone is typing">
                  <TypingIndicator />
                </div>
              ) : activeChat.type !== "group" ? (
                <div className="flex items-center -mt-0.5">
                  <span className="text-[10px] text-text-secondary">
                    {isOnline ? "Online" : "Offline"}
                    {activeChat.otherUser?.lastSeen &&
                      !isOnline &&
                      ` - Last seen ${new Date(activeChat.otherUser.lastSeen).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <FiUsers size={10} className="text-text-secondary" />
                  <span className="text-[11px] text-text-secondary">
                    {activeChat.participants?.length || 0} members
                  </span>
                  <span className="w-1 h-1 rounded-full bg-[var(--theme-border)]" />
                  <FiShield size={10} className="text-text-secondary" />
                  <span className="text-[10px] text-text-secondary">
                    Encrypted
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <div className="flex items-center gap-2.5" aria-label="Emotune">
            <img
              src="/logo.png"
              alt=""
              className="h-10 w-10 object-contain"
            />
            <TextLogo size="lg" showDecoration={false} />
          </div>
        )}
      </div>

      {activeChat && (
        <nav className="flex items-center gap-1" aria-label="Chat actions">
          <div className="hidden md:flex items-center">
            <IconButton icon={FiSearch} size="md" label="Search in chat" />
            <IconButton
              icon={FiZap}
              size="md"
              onClick={onOpenAIPanel}
              label="AI Assistant"
            />
          </div>

          <div
            className="w-px h-6 bg-[var(--theme-border)] mx-1 hidden md:block"
            aria-hidden="true"
          />

          <div className="relative" ref={actionsRef}>
            <IconButton
              icon={FiMoreVertical}
              size="md"
              onClick={() => setShowQuickActions(!showQuickActions)}
              label="More actions"
              active={showQuickActions}
            />
            <Menu
              isOpen={showQuickActions}
              onClose={() => setShowQuickActions(false)}
              ref={actionsRef}
              className="top-full mt-1"
            >
              <MenuItem
                icon={FiMoon}
                label={isSilent ? "Silent: ON" : "Silent: OFF"}
                onClick={() => {
                  onToggleSilent();
                  setShowQuickActions(false);
                }}
              />
              <MenuItem
                icon={FiUser}
                label="Persona"
                onClick={() => {
                  onOpenPersona();
                  setShowQuickActions(false);
                }}
              />
              <MenuItem
                icon={FiZap}
                label="AI Suggestions"
                onClick={() => {
                  onOpenAIPanel();
                  setShowQuickActions(false);
                }}
              />
              <MenuItem
                icon={FiSearch}
                label="Search in chat"
                onClick={() => setShowQuickActions(false)}
              />
              <MenuItem
                icon={FiLayers}
                label="Ghost Session"
                onClick={() => {
                  onOpenGhostSession?.("whiteboard");
                  setShowQuickActions(false);
                }}
              />
              {activeChat?.type === "group" && (
                <MenuItem
                  icon={FiBarChart2}
                  label="DecideFlow"
                  onClick={() => {
                    onOpenDecideFlow?.();
                    setShowQuickActions(false);
                  }}
                />
              )}
              <Divider />
              <MenuItem
                icon={FiPhone}
                label="Voice call"
                onClick={() => setShowQuickActions(false)}
              />
              <MenuItem
                icon={FiVideo}
                label="Video call"
                onClick={() => setShowQuickActions(false)}
              />
              <MenuItem
                icon={FiStar}
                label="Pinned Messages"
                onClick={() => setShowQuickActions(false)}
              />
              <MenuItem
                icon={FiBookmark}
                label="Bookmarks"
                onClick={() => {
                  onOpenBookmarks();
                  setShowQuickActions(false);
                }}
              />
              <MenuItem
                icon={FiInfo}
                label="Chat Info"
                onClick={() => {
                  onToggleRightPanel();
                  setShowQuickActions(false);
                }}
              />
            </Menu>
          </div>

          <IconButton
            icon={FiInfo}
            size="md"
            onClick={onToggleRightPanel}
            label="Chat info"
            active={showMore}
          />
        </nav>
      )}
    </header>
  );
}

export default memo(Navbar);
