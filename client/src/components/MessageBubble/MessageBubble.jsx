import { memo, useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import AudioMessage from "./AudioMessage";
import BubbleActions from "./BubbleActions";
import BubbleContainer from "./BubbleContainer";
import BubbleFooter from "./BubbleFooter";
import BubbleHeader from "./BubbleHeader";
import BubbleMenu from "./BubbleMenu";
import ContactMessage from "./ContactMessage";
import DocumentMessage from "./DocumentMessage";
import EmojiMessage from "./EmojiMessage";
import FileMessage from "./FileMessage";
import ForwardedLabel from "./ForwardedLabel";
import GifMessage from "./GifMessage";
import ImageMessage from "./ImageMessage";
import LocationMessage from "./LocationMessage";
import MediaPreviewModal from "./MediaPreviewModal";
import MessageMetaBadges from "./MessageMetaBadges";
import PollMessage from "./PollMessage";
import ReactionBar from "./ReactionBar";
import ReactionDetails from "./ReactionDetails";
import ReactionPicker from "./ReactionPicker";
import ReplyPreview from "./ReplyPreview";
import SongMessage from "./SongMessage";
import StoryReferenceMessage from "./StoryReferenceMessage";
import StickerMessage from "./StickerMessage";
import TextMessage from "./TextMessage";
import VideoMessage from "./VideoMessage";
import VoiceMessage from "./VoiceMessage";
import useMediaPreview from "./hooks/useMediaPreview";
import {
  getBubbleVariant,
  getMediaCaption,
  getMessageType,
  getSenderAvatar,
  getSenderName,
  isMessageDeleted,
} from "./utils/messageHelpers";

const RENDERERS = Object.freeze({
  image: ImageMessage,
  video: VideoMessage,
  gif: GifMessage,
  audio: AudioMessage,
  voice: VoiceMessage,
  file: FileMessage,
  document: DocumentMessage,
  location: LocationMessage,
  map: LocationMessage,
  contact: ContactMessage,
  poll: PollMessage,
  decision: PollMessage,
  sticker: StickerMessage,
  emoji: EmojiMessage,
  song: SongMessage,
  text: TextMessage,
  shayari: TextMessage,
  story_reply: StoryReferenceMessage,
  story_share: StoryReferenceMessage,
});

const DELETED_MESSAGE_TEXT = "This message was deleted";

function MessageBubble({
  message,
  mediaMessages,
  isOwn,
  showSender,
  userId,
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
  isPinned,
  currentUserAvatar,
  receiverAvatar,
  isFirstInGroup = true,
  isLastInGroup = true,
  activePopup = null,
  onPopupChange,
  popupBoundaryRef,
}) {
  const rootRef = useRef(null);
  const reactionAnchorRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [reactionDetailsOpen, setReactionDetailsOpen] = useState(false);
  const preview = useMediaPreview();
  const deletedForEveryone = Boolean(
    message.deletedForEveryone ||
    message.deleted_for_everyone ||
    message.messageStatus === "deleted" ||
    message.message_status === "deleted",
  );
  const renderMessage = deletedForEveryone
    ? {
        ...message,
        type: "text",
        content: DELETED_MESSAGE_TEXT,
        mediaUrl: null,
        metadata: {},
      }
    : message;
  const type = deletedForEveryone ? "text" : getMessageType(message);
  const variant = getBubbleVariant(type);
  const Renderer = RENDERERS[type] || TextMessage;
  const senderName = getSenderName(message);
  const hasCaption = deletedForEveryone
    ? false
    : Boolean(getMediaCaption(message));

  const messageId = String(message?._id || "");
  const openPanel = activePopup?.messageId === messageId ? activePopup.panel : null;
  const reactionId = `reaction-picker-${messageId}`;
  const menuId = `message-menu-${messageId}`;
  const closePopovers = useCallback(() => onPopupChange?.(null), [onPopupChange]);

  const openMedia = useCallback(
    () => preview.openPreview(message),
    [message, preview.openPreview],
  );
  const handleReply = useCallback(() => {
    onReply?.(message);
    closePopovers();
    setIsHovered(false);
  }, [closePopovers, message, onReply]);
  const handleForward = useCallback(() => {
    onForward?.(message);
    closePopovers();
    setIsHovered(false);
  }, [closePopovers, message, onForward]);
  const handleReact = useCallback(() => {
    setIsHovered(true);
    onPopupChange?.(openPanel === "reaction" ? null : { messageId, panel: "reaction" });
  }, [messageId, onPopupChange, openPanel]);
  const handleMore = useCallback(() => {
    setIsHovered(true);
    onPopupChange?.(openPanel === "menu" ? null : { messageId, panel: "menu" });
  }, [messageId, onPopupChange, openPanel]);
  const handlePick = useCallback(
    async (emoji) => {
      await onReact?.(message, emoji);
      closePopovers();
    },
    [closePopovers, message, onReact],
  );
  const leave = useCallback(() => {
    setIsHovered(false);
  }, []);
  const handlePointerDown = useCallback((event) => {
    if (event.pointerType !== "mouse") setIsHovered(true);
  }, []);

  const content = useMemo(
    () => <Renderer message={renderMessage} isOwn={isOwn} onOpen={openMedia} onOpenStory={onOpenStory} />,
    [Renderer, isOwn, renderMessage, openMedia, onOpenStory],
  );
  if (isMessageDeleted(message, userId)) return null;

  const overlayFooter = variant === "media" && !hasCaption;
  const floatingFooter = variant === "chromeless";
  const avatar = isOwn
    ? currentUserAvatar || getSenderAvatar(message)
    : getSenderAvatar(message) || receiverAvatar;
  return (
    <>
      <BubbleContainer
        isOwn={isOwn}
        isFirstInGroup={isFirstInGroup}
        isLastInGroup={isLastInGroup}
        isGrouped={!isFirstInGroup}
        variant={variant}
        isPinned={isPinned}
        showAvatar={isLastInGroup}
        avatar={avatar}
        senderName={senderName}
        containerRef={rootRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={leave}
        onPointerDown={handlePointerDown}
        actions={
          <BubbleActions
            isOwn={isOwn}
            onReact={handleReact}
            onReply={handleReply}
            onForward={handleForward}
            onMore={handleMore}
            menuOpen={openPanel === "menu"}
            reactionOpen={openPanel === "reaction"}
            menuId={openPanel === "menu" ? menuId : undefined}
            reactionId={openPanel === "reaction" ? reactionId : undefined}
            visible={isHovered || Boolean(openPanel)}
            onMouseEnter={() => setIsHovered(true)}
          />
        }
        picker={
          openPanel === "reaction" ? <ReactionPicker id={reactionId} anchorRef={rootRef} isOwn={isOwn} onPick={handlePick} /> : null
        }
        menu={
          openPanel === "menu" ? (
            <BubbleMenu
              message={message}
              isOwn={isOwn}
              isPinned={isPinned}
              onClose={closePopovers}
              onReply={onReply}
              onForward={onForward}
              onEdit={onEdit}
              onPin={onPin}
              onUnpin={onUnpin}
              onDeleteForMe={onDeleteForMe}
              onDeleteForEveryone={onDeleteForEveryone}
              onShowInfo={onShowInfo}
              onBookmark={onBookmark}
              anchorRef={rootRef}
              id={menuId}
            />
          ) : null
        }
        reactions={
          <ReactionBar
            reactions={message.reactions}
            userId={userId}
            onReact={handlePick}
            ref={reactionAnchorRef}
            onOpenDetails={() => setReactionDetailsOpen(true)}
          />
        }
      >
        <BubbleHeader
          showSender={showSender && !isOwn && isFirstInGroup}
          senderName={senderName}
        />
        <ForwardedLabel forwardedFrom={message.metadata?.forwardedFrom} />
        <MessageMetaBadges message={message} />
        <ReplyPreview reply={message.replyTo} isOwn={isOwn} />
        {content}
        <BubbleFooter
          message={message}
          isOwn={isOwn}
          userId={userId}
          overlay={overlayFooter}
          floating={floatingFooter}
          compact={variant === "default"}
        />
      </BubbleContainer>
      {reactionDetailsOpen && (
        <ReactionDetails
          message={message}
          userId={userId}
          anchorRef={reactionAnchorRef}
          boundaryRef={popupBoundaryRef}
          onReact={handlePick}
          onClose={() => setReactionDetailsOpen(false)}
        />
      )}
      <AnimatePresence>
        {preview.previewMessage && (
          <MediaPreviewModal
            message={preview.previewMessage}
            messages={mediaMessages}
            onClose={preview.closePreview}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default memo(MessageBubble);
