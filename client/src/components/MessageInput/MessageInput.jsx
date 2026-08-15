import { useState, useRef, useEffect, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiSend,
  FiSmile,
  FiCornerUpLeft,
  FiEdit2,
  FiX,
  FiFile,
  FiFileText,
  FiImage,
  FiMapPin,
  FiCamera,
  FiMic,
  FiCalendar,
  FiBarChart2,
  FiStar,
  FiFilm,
  FiMusic,
  FiVideo,
  FiUploadCloud,
  FiSearch,
} from "react-icons/fi";
import { TbCategoryPlus } from "react-icons/tb";
import { AiOutlineGif } from "react-icons/ai";
import { RiEmojiStickerLine } from "react-icons/ri";
import { aiService, uploadFile } from "../../services/api";
import Picker from "@emoji-mart/react";
import emojiData from "@emoji-mart/data";
import { useTheme } from "../../hooks/useTheme";

const FILE_ICONS = {
  image: FiImage,
  video: FiVideo,
  audio: FiMusic,
  default: FiFile,
};

const ATTACHMENT_OPTIONS = [
  {
    id: "document",
    label: "Document",
    icon: FiFileText,
    accept: ".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx",
  },
  { id: "location", label: "Location", icon: FiMapPin },
  {
    id: "camera",
    label: "Camera",
    icon: FiCamera,
    accept: "image/*",
    capture: "environment",
  },
  { id: "audio", label: "Audio", icon: FiMic, accept: "audio/*" },
  { id: "video", label: "Video", icon: FiVideo, accept: "video/*" },
  { id: "image", label: "Image", icon: FiImage, accept: "image/*" },
  { id: "poll", label: "Poll", icon: FiBarChart2 },
  { id: "event", label: "Event", icon: FiCalendar },
];

const STICKER_CATEGORIES = [
  "Trending",
  "Love",
  "Kiss",
  "Cute",
  "Happy",
  "Sad",
  "Animals",
  "Anime",
  "Couples",
  "Greetings",
  "Festival",
  "Funny",
];

const GIF_CATEGORIES = [
  "Trending",
  "Reaction",
  "Love",
  "Happy",
  "Sad",
  "Funny",
  "Animals",
  "Movies",
  "Anime",
  "Sports",
  "Celebration",
  "Memes",
];

const FALLBACK_STICKER_PRESETS = [
  ["WOW", "#7C3AED", "#F5F3FF"],
  ["LOL", "#16A34A", "#F0FDF4"],
  ["YAY", "#F59E0B", "#FFFBEB"],
  ["OK", "#2563EB", "#EFF6FF"],
  ["HI", "#06B6D4", "#ECFEFF"],
  ["BYE", "#64748B", "#F8FAFC"],
  ["LOVE", "#E11D48", "#FFF1F2"],
  ["KISS", "#DB2777", "#FDF2F8"],
  ["HUG", "#F43F5E", "#FFE4E6"],
  ["CUTE", "#8B5CF6", "#F5F3FF"],
  ["AWW", "#EC4899", "#FDF2F8"],
  ["YES", "#22C55E", "#F0FDF4"],
  ["NOPE", "#EF4444", "#FEF2F2"],
  ["SAD", "#475569", "#F1F5F9"],
  ["CRY", "#0284C7", "#E0F2FE"],
  ["OMG", "#EA580C", "#FFF7ED"],
  ["FIRE", "#DC2626", "#FEF2F2"],
  ["COOL", "#4F46E5", "#EEF2FF"],
  ["MEOW", "#F97316", "#FFF7ED"],
  ["WOOF", "#84CC16", "#F7FEE7"],
];

const FALLBACK_STICKER_CATEGORY_LABELS = {
  Trending: ["WOW", "LOL", "YAY", "OMG", "FIRE", "VIBE", "OK", "COOL"],
  Love: ["LOVE", "HEART", "MISS U", "HUG", "XO", "ILY", "SWEET", "CARE"],
  Kiss: ["KISS", "MUAH", "XOXO", "SMOOCH", "LOVE", "XO", "CUTIE", "BLUSH"],
  Cute: ["CUTE", "AWW", "SOFT", "SMOL", "KAWAII", "BABY", "SWEET", "SHY"],
  Happy: ["YAY", "LOL", "SMILE", "WOW", "CHEER", "FUN", "NICE", "COOL"],
  Sad: ["SAD", "CRY", "SORRY", "HMM", "MISS", "LOW", "TEARS", "OKAY"],
  Animals: ["MEOW", "WOOF", "PAW", "BIRD", "BUNNY", "BEAR", "PANDA", "DUCK"],
  Anime: ["KAWAII", "SENPAI", "NANI", "UWU", "ORA", "CHIBI", "NEKO", "YARE"],
  Couples: ["US", "MINE", "SOUL", "DATE", "FOREVER", "HUG", "LOVE", "MATCH"],
  Greetings: ["HI", "HELLO", "HEY", "BYE", "GM", "GN", "WELCOME", "YO"],
  Festival: ["PARTY", "BOOM", "GIFT", "LIGHT", "CAKE", "TADA", "JOY", "SHINE"],
  Funny: ["LOL", "HAHA", "ROFL", "OOPS", "BRUH", "NOPE", "SUS", "MEME"],
};

function makeFallbackStickerSvg(label, foreground, background, index) {
  const tilt = [-9, 6, -4, 8, -6][index % 5];
  const dotX = 58 + ((index * 29) % 132);
  const dotY = 48 + ((index * 37) % 142);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
      <rect width="256" height="256" rx="62" fill="${background}"/>
      <circle cx="${dotX}" cy="${dotY}" r="28" fill="${foreground}" opacity="0.15"/>
      <circle cx="${214 - dotX / 2}" cy="${210 - dotY / 3}" r="34" fill="${foreground}" opacity="0.12"/>
      <path d="M54 172 C82 220 174 220 202 172 C184 237 72 237 54 172Z" fill="${foreground}" opacity="0.16"/>
      <g transform="rotate(${tilt} 128 128)">
        <rect x="30" y="72" width="196" height="96" rx="38" fill="white" opacity="0.94"/>
        <text x="128" y="134" text-anchor="middle" dominant-baseline="middle"
          font-family="Arial, Helvetica, sans-serif" font-size="${label.length > 6 ? 30 : label.length > 4 ? 36 : 44}"
          font-weight="900" fill="${foreground}">${label}</text>
      </g>
    </svg>
  `
    .replace(/\s+/g, " ")
    .trim();
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function getFallbackStickers(category = "Trending", count = 100) {
  const labels =
    FALLBACK_STICKER_CATEGORY_LABELS[category] ||
    FALLBACK_STICKER_CATEGORY_LABELS.Trending;

  return Array.from({ length: count }, (_, index) => {
    const preset =
      FALLBACK_STICKER_PRESETS[index % FALLBACK_STICKER_PRESETS.length];
    const label = labels[index % labels.length];
    const foreground = preset[1];
    const background = preset[2];
    const preview = makeFallbackStickerSvg(
      label,
      foreground,
      background,
      index,
    );

    return {
      id: `frontend-fallback-sticker:${category}:${index}`,
      provider: "frontend-fallback",
      sourceId: `fallback-${category}-${index}`,
      type: "image/svg+xml",
      url: preview,
      preview,
      title: `${label} sticker`,
    };
  });
}

function getFallbackStickerCategory(query, selectedCategory = "Trending") {
  const lower = String(query || "").toLowerCase();
  const matchedCategory = STICKER_CATEGORIES.find((category) =>
    lower.includes(category.toLowerCase()),
  );
  return matchedCategory || selectedCategory || "Trending";
}

function getStickerPreview(sticker) {
  const url = sticker?.preview || sticker?.url || "";
  return /\.(json|lottie)(\?|$)/i.test(url) ? "" : url;
}

function getFileType(mimeType) {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "file";
}

function isOnlyEmojis(str) {
  const trimmed = str.trim();
  if (!trimmed || trimmed.length > 15) return false;
  const stripped = trimmed
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, "")
    .trim();
  return stripped.length === 0;
}

function MessageInput({
  chatId,
  onSend,
  onTyping,
  isSilent,
  replyTo,
  editingMessage,
  onCancelReply,
  onCancelEdit,
}) {
  const { resolvedTheme } = useTheme();
  const pickerTheme = /white|sand|light/i.test(resolvedTheme || "")
    ? "light"
    : "dark";
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [emojiPanelTab, setEmojiPanelTab] = useState("emoji");
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [gifSearch, setGifSearch] = useState("");
  const [stickerSearch, setStickerSearch] = useState("");
  const [gifCategory, setGifCategory] = useState("Trending");
  const [stickerCategory, setStickerCategory] = useState("Trending");
  const [gifs, setGifs] = useState([]);
  const [stickers, setStickers] = useState([]);
  const [loadingGifs, setLoadingGifs] = useState(false);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);
  const gifSearchTimeout = useRef(null);
  const mediaSearchTimeout = useRef(null);
  const gifAbortRef = useRef(null);
  const mediaCacheRef = useRef(new Map());
  const composerRef = useRef(null);
  const emojiPickerContainerRef = useRef(null);

  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;

    const maxHeight = 22 * 6 + 16;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [text]);

  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.content || "");
      inputRef.current?.focus();
    }
  }, [editingMessage]);

  useEffect(() => {
    if (replyTo && !editingMessage) inputRef.current?.focus();
  }, [replyTo, editingMessage]);

  useEffect(() => {
    function handleGlobalKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "e") {
        e.preventDefault();
        setShowEmoji((v) => !v);
        setEmojiPanelTab("emoji");
      }
      if (e.key === "Escape") {
        setShowEmoji(false);
        setShowAttachmentMenu(false);
      }
    }
    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!composerRef.current?.contains(event.target)) {
        setShowEmoji(false);
        setShowAttachmentMenu(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(
    () => () => {
      clearTimeout(gifSearchTimeout.current);
      clearTimeout(mediaSearchTimeout.current);
      gifAbortRef.current?.abort();
    },
    [],
  );

  const fetchGifs = useCallback(
    async (query) => {
      if (!chatId) return;
      const normalizedQuery =
        query === "trending" ? "" : String(query || "").trim();
      const fallbackCategory = getFallbackStickerCategory(
        normalizedQuery,
        stickerCategory,
      );
      const cacheKey = `${normalizedQuery || "__trending__"}:${fallbackCategory}`;
      const cachedMedia = mediaCacheRef.current.get(cacheKey);
      if (cachedMedia) {
        setGifs(cachedMedia.gifs);
        setStickers(cachedMedia.stickers);
        return;
      }

      gifAbortRef.current?.abort();
      const controller = new AbortController();
      gifAbortRef.current = controller;
      setLoadingGifs(true);
      try {
        const { data: response } = await aiService.getGifs(
          chatId,
          { q: normalizedQuery, limit: 24 },
          { signal: controller.signal },
        );
        const payload = response?.data || response || {};
        const nextGifs = Array.isArray(payload.gifs) ? payload.gifs : [];
        const nextStickers = Array.isArray(payload.stickers)
          ? payload.stickers
          : Array.isArray(payload.sticker)
            ? payload.sticker
            : [];
        const displayStickers = nextStickers.some((sticker) =>
          getStickerPreview(sticker),
        )
          ? nextStickers
          : getFallbackStickers(fallbackCategory, 100);
        mediaCacheRef.current.set(cacheKey, {
          gifs: nextGifs,
          stickers: displayStickers,
        });
        setGifs(nextGifs);
        setStickers(displayStickers);
      } catch (error) {
        if (error.name !== "CanceledError" && error.name !== "AbortError") {
          setGifs((current) => current);
          setStickers((current) =>
            current.some((sticker) => getStickerPreview(sticker))
              ? current
              : getFallbackStickers(fallbackCategory, 100),
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoadingGifs(false);
      }
    },
    [chatId, stickerCategory],
  );

  useEffect(() => {
    const shouldLoadMedia =
      showEmoji && (emojiPanelTab === "sticker" || emojiPanelTab === "gif");
    if (!shouldLoadMedia) return undefined;
    fetchGifs("trending");
    return () => gifAbortRef.current?.abort();
  }, [showEmoji, emojiPanelTab, fetchGifs]);

  useEffect(() => {
    if (!showEmoji || emojiPanelTab !== "emoji") return undefined;
    const picker =
      emojiPickerContainerRef.current?.querySelector("em-emoji-picker");
    if (!picker) return undefined;
    picker.style.setProperty("width", "100%", "important");
    picker.style.setProperty("min-width", "100%", "important");
    picker.style.setProperty("max-width", "100%", "important");
    return undefined;
  }, [showEmoji, emojiPanelTab]);

  const handleGifSearch = useCallback(
    (value) => {
      setGifSearch(value);
      clearTimeout(gifSearchTimeout.current);
      const term =
        value.trim() ||
        (gifCategory === "Trending" ? "trending" : gifCategory.toLowerCase());
      gifSearchTimeout.current = setTimeout(() => fetchGifs(term), 400);
    },
    [fetchGifs, gifCategory],
  );

  const scheduleMediaSearch = useCallback(
    (value, category) => {
      clearTimeout(mediaSearchTimeout.current);
      const term =
        value.trim() ||
        (category === "Trending" ? "trending" : category.toLowerCase());
      mediaSearchTimeout.current = setTimeout(() => fetchGifs(term), 250);
    },
    [fetchGifs],
  );

  const handleStickerSearch = useCallback(
    (value) => {
      setStickerSearch(value);
      scheduleMediaSearch(value, stickerCategory);
    },
    [scheduleMediaSearch, stickerCategory],
  );

  const handleStickerCategory = useCallback(
    (category) => {
      setStickerCategory(category);
      scheduleMediaSearch(stickerSearch, category);
    },
    [scheduleMediaSearch, stickerSearch],
  );

  const handleGifCategory = useCallback(
    (category) => {
      setGifCategory(category);
      scheduleMediaSearch(gifSearch, category);
    },
    [gifSearch, scheduleMediaSearch],
  );

  const handleGifSelect = useCallback(
    (gif) => {
      const gifUrl =
        gif.url || gif.images?.fixed_height?.url || gif.images?.original?.url;
      onSend(gif.title || "GIF", "gif", {
        gifId: gif.sourceId || gif.id,
        sourceId: gif.sourceId,
        provider: gif.provider,
        gifUrl,
        mediaUrl: gifUrl,
        fileType: "image/gif",
        gifTitle: gif.title || "",
      });
      setShowEmoji(false);
      setEmojiPanelTab("emoji");
      setGifSearch("");
    },
    [onSend],
  );

  const handleChange = (e) => {
    setText(e.target.value);
    if (onTyping) {
      onTyping(true);
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => onTyping(false), 1500);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingMessage) {
      if (!text.trim()) return;
      onSend(text, "text", {});
      setText("");
      if (onTyping) onTyping(false);
      inputRef.current?.focus();
      return;
    }
    if (selectedFiles.length > 0) {
      sendFiles(selectedFiles);
      return;
    }
    if (!text.trim()) return;
    const trimmed = text.trim();
    const type = isOnlyEmojis(trimmed) ? "emoji" : "text";
    onSend(trimmed, type, type === "emoji" ? { emoji: trimmed } : {});
    setText("");
    if (onTyping) onTyping(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleEmojiPick = useCallback(
    (emoji) => {
      const nextEmoji = emoji.native || emoji;
      setText((prev) => prev + nextEmoji);
      onTyping?.(true);
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => onTyping?.(false), 1500);
      inputRef.current?.focus();
    },
    [onTyping],
  );

  const handleStickerSelect = useCallback(
    (sticker) => {
      const stickerUrl = getStickerPreview(sticker);
      if (!stickerUrl) return;
      onSend(sticker.title || "Sticker", "sticker", {
        stickerId: sticker.sourceId || sticker.id,
        sourceId: sticker.sourceId,
        provider: sticker.provider,
        stickerTitle: sticker.title || "Sticker",
        mediaUrl: stickerUrl,
        fileType: sticker.type || "image/webp",
      });
      setShowEmoji(false);
      setEmojiPanelTab("emoji");
    },
    [onSend],
  );

  const sendFiles = async (files) => {
    setUploading(true);
    try {
      for (const file of files) {
        const fileType = getFileType(file.type);
        setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }));
        const result = await uploadFile(file, (pct) =>
          setUploadProgress((prev) => ({ ...prev, [file.name]: pct })),
        );
        onSend(file.name, fileType, {
          fileName: result.fileName,
          fileSize: result.fileSize,
          fileType: result.fileType,
          mediaUrl: result.url,
        });
      }
      setSelectedFiles([]);
    } catch {
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setSelectedFiles((prev) => [...prev, ...files]);
    e.target.value = "";
    e.target.accept = "*/*";
    e.target.removeAttribute("capture");
  };

  const handleAttachmentOption = (option) => {
    if (option.accept) {
      const input = fileRef.current;
      if (!input) return;
      input.accept = option.accept;
      if (option.capture) input.setAttribute("capture", option.capture);
      else input.removeAttribute("capture");
      setShowAttachmentMenu(false);
      input.click();
      return;
    }

    // These entries are ready for their dedicated composer flows.
    setShowAttachmentMenu(false);
  };

  const removeFile = (index) =>
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));

  const formatFileSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const hasContent = text.trim() || selectedFiles.length > 0 || editingMessage;

  return (
    <form
      onSubmit={handleSubmit}
      ref={composerRef}
      className="relative border-t border-border/70 bg-surface/95 p-1 backdrop-blur-xl"
      aria-label="Message input"
    >
      <AnimatePresence>
        {(replyTo || editingMessage) && (
          <motion.div
            initial={{}}
            animate={{}}
            exit={{}}
            className="mx-auto flex max-w-[1180px] items-center gap-3 rounded-full border border-border bg-surface px-3 py-2 mb-2 backdrop-blur-glass"
            role="status"
            aria-live="polite"
          >
            <div className="flex-shrink-0">
              {editingMessage ? (
                <FiEdit2 size={14} className="text-primary" />
              ) : (
                <FiCornerUpLeft
                  size={14}
                  className="text-[var(--theme-accent)]"
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-primary">
                {editingMessage
                  ? "Editing message"
                  : `Replying to ${replyTo?.sender?.username || "message"}`}
              </p>
              <p className="text-xs truncate opacity-60">
                {editingMessage
                  ? editingMessage.content
                  : replyTo?.content || replyTo?.metadata?.emoji || ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (editingMessage) {
                  onCancelEdit?.();
                  setText("");
                } else onCancelReply?.();
              }}
              className="p-1 rounded-lg hover:bg-hover/[0.07] text-text-secondary focus:outline-none focus:ring-2 focus:ring-focus"
              aria-label={editingMessage ? "Cancel edit" : "Cancel reply"}
            >
              <FiX size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedFiles.length > 0 && (
          <motion.div
            initial={{}}
            animate={{}}
            exit={{}}
            className="mx-auto flex max-w-[1180px] flex-wrap gap-2 mb-2"
            role="list"
            aria-label="Selected files"
          >
            {selectedFiles.map((file, index) => {
              const fileType = getFileType(file.type);
              const Icon = FILE_ICONS[fileType] || FILE_ICONS.default;
              const previewUrl =
                fileType === "image" || fileType === "video"
                  ? URL.createObjectURL(file)
                  : null;
              const progress = uploadProgress[file.name];
              return (
                <motion.div
                  key={index}
                  initial={{}}
                  animate={{}}
                  exit={{}}
                  className="relative group"
                  role="listitem"
                >
                  <div className="w-16 h-16 rounded-xl bg-surface backdrop-blur-glass border border-border overflow-hidden flex items-center justify-center">
                    {progress != null && progress < 100 ? (
                      <div className="flex flex-col items-center gap-1">
                        <FiUploadCloud
                          size={18}
                          className="text-primary animate-pulse"
                        />
                        <span className="text-[9px] text-primary font-medium">
                          {progress}%
                        </span>
                      </div>
                    ) : previewUrl && fileType === "image" ? (
                      <img
                        src={previewUrl}
                        alt={file.name}
                        className="w-full h-full object-cover"
                        onLoad={() => URL.revokeObjectURL(previewUrl)}
                      />
                    ) : previewUrl && fileType === "video" ? (
                      <video
                        src={previewUrl}
                        className="w-full h-full object-cover"
                        muted
                        aria-label={file.name}
                      />
                    ) : (
                      <Icon size={24} className="text-primary" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-danger text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-[var(--theme-danger)]"
                    aria-label={`Remove ${file.name}`}
                  >
                    <FiX size={10} />
                  </button>
                  <p className="text-[9px] text-text-secondary truncate max-w-16 mt-0.5 text-center">
                    {file.name.split(".").pop()}
                  </p>
                </motion.div>
              );
            })}
            <div className="flex items-center text-xs text-text-secondary px-2">
              {selectedFiles.length} file{selectedFiles.length > 1 ? "s" : ""}{" "}
              selected
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto flex w-full max-w-[1180px] items-center gap-2 px-2">
        <button
          type="button"
          onClick={() => {
            setShowEmoji((v) => !v);
            setEmojiPanelTab("emoji");
          }}
          className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-full border border-border bg-surface text-text-secondary transition hover:bg-hover/[0.07] hover:text-text-primary cursor-pointer"
          aria-label={showEmoji ? "Close emoji picker" : "Open emoji picker"}
          aria-expanded={showEmoji}
        >
          <FiSmile size={22} />
        </button>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          multiple
          accept="*/*"
          aria-hidden="true"
        />

        <div className="relative flex flex-1 items-center">
          <textarea
            ref={inputRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={
              editingMessage
                ? "Edit your message..."
                : isSilent
                  ? "Type a silent message..."
                  : "Type a message..."
            }
            rows={1}
            className="min-h-[42px] w-full max-h-[148px] resize-none overflow-y-hidden scrollbar-hide rounded-3xl border border-border bg-surface px-3 py-[11px] pr-[84px] text-[14px] leading-[18px] text-text-primary placeholder:text-placeholder shadow-sm backdrop-blur-glass transition-colors focus:border-border focus:outline-none focus:ring-0"
            aria-label={
              editingMessage
                ? "Edit message"
                : isSilent
                  ? "Silent message"
                  : "Message"
            }
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowAttachmentMenu((value) => !value);
                  setShowEmoji(false);
                }}
                disabled={uploading}
                className="inline-flex h-8 min-w-[28px] items-center justify-center rounded-full border-0 bg-transparent px-1 text-text-secondary transition hover:bg-hover/[0.07] hover:text-text-primary cursor-pointer"
                aria-label="Open attachment options"
                aria-expanded={showAttachmentMenu}
                aria-haspopup="menu"
              >
                <TbCategoryPlus size={19} />
              </button>

              {showAttachmentMenu && (
                <div
                  className="absolute bottom-full right-0 z-50 mb-2 grid w-[230px] grid-cols-2 gap-1 rounded-lg border border-border bg-surface-elevated py-2 shadow-floating"
                  role="menu"
                  aria-label="Attachment options"
                >
                  {ATTACHMENT_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleAttachmentOption(option)}
                        className="flex items-center gap-2 rounded-xl px-1.5 py-1 text-left text-sm font-medium text-text-secondary transition hover:bg-hover/[0.08] hover:text-text-primary"
                        role="menuitem"
                      >
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                          <Icon size={15} aria-hidden="true" />
                        </span>
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <motion.button
          type="submit"
          disabled={!hasContent || uploading}
          className={`inline-flex h-10 w-10 items-center justify-center rounded-full flex-shrink-0 transition-all focus:outline-none focus:ring-2 focus:ring-focus ${
            hasContent && !uploading
              ? "bg-primary text-white shadow-[0_0_18px_rgba(85,94,255,0.35)] hover:brightness-110"
              : "border border-border bg-surface/80 text-text-secondary backdrop-blur-glass"
          }`}
          aria-label={
            editingMessage
              ? "Send edit"
              : uploading
                ? "Uploading"
                : "Send message"
          }
        >
          {uploading ? (
            <span
              className="block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
              role="status"
              aria-label="Uploading"
            />
          ) : editingMessage ? (
            <FiEdit2 size={20} />
          ) : (
            <FiSend size={20} />
          )}
        </motion.button>
      </div>

      <AnimatePresence>
        {showEmoji && (
          <motion.div
            initial={{}}
            animate={{}}
            exit={{}}
            className="absolute bottom-full left-1 right-auto z-50 w-[350px] max-w-[calc(100vw-1rem)] overflow-hidden border border-border bg-surface-muted/30 shadow-floating backdrop-blur-glass rounded-lg"
          >
            <div className="flex h-[380px] w-full max-h-[calc(100vh-1rem)] flex-col overflow-hidden rounded-lg">
              <div className="flex w-full bg-surface-muted/90 shrink-0 items-center gap-1 border-b border-border py-1.5">
                {[
                  { id: "emoji", label: "Emoji", icon: FiSmile },
                  { id: "sticker", label: "Sticker", icon: RiEmojiStickerLine },
                  { id: "gif", label: "GIF", icon: AiOutlineGif },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = emojiPanelTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        if (tab.id === "gif") {
                          setShowEmoji(true);
                          setEmojiPanelTab("gif");
                        } else {
                          setEmojiPanelTab(tab.id);
                        }
                      }}
                      className={`inline-flex h-[28px] w-12 items-center justify-center transition ${
                        isActive
                          ? "text-primary"
                          : "text-text-secondary hover:text-text-primary"
                      }`}
                      aria-label={`Open ${tab.label} picker`}
                      aria-pressed={isActive}
                    >
                      <Icon size={21} />
                    </button>
                  );
                })}
              </div>

              {emojiPanelTab === "emoji" ? (
                <div ref={emojiPickerContainerRef} className="w-full min-w-0">
                  <Picker
                    data={emojiData}
                    onEmojiSelect={handleEmojiPick}
                    theme={pickerTheme}
                    previewPosition="none"
                    set="native"
                    skinTonePosition="none"
                    maxFrequentRows={1}
                    perLine={9}
                    emojiSize={22}
                    className="w-full min-w-0"
                  />
                </div>
              ) : emojiPanelTab === "sticker" ? (
                <>
                  <div className="flex shrink-0 items-center bg-surface-muted/90 gap-2 border-b border-border px-2 py-1.5">
                    <div className="min-w-0 flex-1">
                      <input
                        value={stickerSearch}
                        onChange={(event) =>
                          handleStickerSearch(event.target.value)
                        }
                        placeholder="Search stickers"
                        className="h-8 w-full rounded-full border border-border bg-surface px-3 text-xs text-text-primary outline-none placeholder:text-placeholder focus:border-primary"
                        aria-label="Search stickers"
                      />
                    </div>
                    <div className="flex max-w-[58%] shrink-0 gap-1 overflow-x-auto scrollbar-hide">
                      {STICKER_CATEGORIES.map((category) => (
                        <button
                          key={category}
                          type="button"
                          onClick={() => handleStickerCategory(category)}
                          className={`shrink-0 rounded-full px-2.5 py-1 border border-border text-[10px] font-semibold transition ${
                            stickerCategory === category
                              ? "bg-primary text-white"
                              : "bg-surface text-text-secondary hover:bg-hover/[0.08] hover:text-text-primary"
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </div>
                  {loadingGifs ? (
                    <div
                      className="grid min-h-0 flex-1 grid-cols-4 bg-surface-muted/90 content-start gap-2 overflow-y-auto p-1"
                      role="status"
                      aria-label="Loading stickers"
                    >
                      {Array.from({ length: 12 }).map((_, index) => (
                        <div
                          key={index}
                          className="h-16 animate-pulse rounded-md bg-hover/[0.08]"
                        />
                      ))}
                    </div>
                  ) : stickers.filter((sticker) => getStickerPreview(sticker))
                      .length > 0 ? (
                    <div className="grid min-h-0 flex-1 grid-cols-4 bg-surface-muted/90 content-start gap-2 overflow-y-auto p-1">
                      {stickers
                        .filter((sticker) => getStickerPreview(sticker))
                        .map((sticker) => (
                          <button
                            key={sticker.id || sticker.url}
                            type="button"
                            onClick={() => handleStickerSelect(sticker)}
                            className="flex aspect-square items-center justify-center rounded-md bg-surface p-1 transition hover:bg-hover/[0.08] focus:outline-none focus:ring-2 focus:ring-focus"
                            aria-label={sticker.title || "Sticker"}
                          >
                            <img
                              src={getStickerPreview(sticker)}
                              alt={sticker.title || "Sticker"}
                              className="block h-full max-h-full max-w-full w-full object-contain"
                              loading="lazy"
                            />
                          </button>
                        ))}
                    </div>
                  ) : (
                    <div className="flex min-h-0 flex-1 items-center justify-center px-5 text-center text-xs text-text-secondary">
                      No stickers available.
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div
                    className="flex shrink-0 items-center gap-2 bg-surface-muted/90 border-b border-border px-2 py-1.5"
                    role="search"
                    aria-label="Search GIFs"
                  >
                    <div className="relative min-w-0 flex-1">
                      <input
                        type="text"
                        value={gifSearch}
                        onChange={(event) =>
                          handleGifSearch(event.target.value)
                        }
                        placeholder="Search GIFs..."
                        className="h-8 w-full rounded-full border border-border bg-surface px-3 pl-3 text-xs text-text-primary placeholder:text-placeholder transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-focus"
                        aria-label="Search GIFs"
                      />
                    </div>
                    <div className="flex max-w-[58%] shrink-0 gap-1 overflow-x-auto scrollbar-hide">
                      {GIF_CATEGORIES.map((category) => (
                        <button
                          key={category}
                          type="button"
                          onClick={() => handleGifCategory(category)}
                          className={`shrink-0 rounded-full px-2.5 py-1 border border-border text-[10px] font-semibold transition ${
                            gifCategory === category
                              ? "bg-primary text-white"
                              : "bg-surface text-text-secondary hover:bg-hover/[0.08] hover:text-text-primary"
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto p-2 scrollbar-hide">
                    {loadingGifs ? (
                      <div
                        className="grid grid-cols-3 gap-1.5"
                        role="status"
                        aria-label="Loading GIFs"
                      >
                        {Array.from({ length: 9 }).map((_, index) => (
                          <div
                            key={index}
                            className="aspect-square animate-pulse rounded-xl bg-hover/[0.08]"
                          />
                        ))}
                      </div>
                    ) : gifs.length === 0 ? (
                      <div className="py-8 text-center text-sm text-text-secondary">
                        {gifSearch.trim()
                          ? "No GIFs found"
                          : "No trending GIFs available"}
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-1.5">
                        {gifs.map((gif) => (
                          <button
                            key={gif.id}
                            type="button"
                            onClick={() => handleGifSelect(gif)}
                            className="aspect-square overflow-hidden bg-surface-muted/90 rounded-md transition-colors hover:opacity-85 focus:outline-none focus:ring-2 focus:ring-focus"
                            aria-label={gif.title || "GIF"}
                          >
                            <img
                              src={
                                gif.preview ||
                                gif.url ||
                                gif.images?.fixed_height?.url ||
                                gif.images?.original?.url
                              }
                              alt={gif.title || "GIF"}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}

export default memo(MessageInput);
