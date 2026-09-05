import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IoClose,
  IoText,
  IoImageOutline,
  IoVideocamOutline,
  IoMusicalNotesOutline,
  IoMicOutline,
  IoImagesOutline,
  IoStatsChartOutline,
  IoHelpCircleOutline,
  IoLinkOutline,
  IoLocationOutline,
  IoTimeOutline,
  IoSparklesOutline,
  IoCreateOutline,
} from "react-icons/io5";
import { FaArrowRightLong } from "react-icons/fa6";
import { MdOutlineLocationOn } from "react-icons/md";
import { toast } from "sonner";
import storyService from "../../services/storyService";
import { aiService } from "../../services/api";
import {
  STICKER_CATEGORIES,
  getFallbackStickers,
  getStickerPreview,
} from "../MessageInput/MessageInput";
import StickerMaker from "./StickerMaker";
import { drawSmoothPath } from "./stickerStudioEngine";

const COLORS = [
  "#1a1a2e",
  "#16213e",
  "#0f3460",
  "#533483",
  "#e94560",
  "#ff6b6b",
  "#ffd93d",
  "#6bcb77",
  "#4d96ff",
  "#ff6b9d",
  "#00b4d8",
  "#7209b7",
  "#f72585",
  "#06d6a0",
  "#118ab2",
];
const FONTS = [
  { name: "Classic", value: "serif" },
  { name: "Modern", value: "sans-serif" },
  { name: "Elegant", value: "cursive" },
  { name: "Bold", value: "Impact" },
  { name: "Playful", value: "Comic Sans MS" },
  { name: "Minimal", value: "system-ui" },
  { name: "Vintage", value: "Georgia" },
  { name: "Handwritten", value: "Segoe Print" },
];
const LAYOUTS = [
  "full",
  "split",
  "bottom",
  "top",
  "minimal",
  "collage",
  "meme",
  "storybook",
];
const FILTERS = [
  "Warm Glow",
  "Cool Breeze",
  "Golden Hour",
  "Noir",
  "Pastel Dream",
  "Vivid Pop",
  "Vintage",
  "B&W Classic",
];
const MOODS = [
  "happy",
  "joyful",
  "romantic",
  "sad",
  "energetic",
  "calm",
  "grateful",
  "excited",
  "thoughtful",
];

function createTextStickerDataUrl(text, foreground, background) {
  const safeText = String(text || "✨")
    .slice(0, 80)
    .replace(/[<>&"']/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300" viewBox="0 0 600 300"><rect x="12" y="12" width="576" height="276" rx="72" fill="${background}"/><text x="300" y="165" text-anchor="middle" dominant-baseline="middle" fill="${foreground}" font-family="sans-serif" font-size="72" font-weight="800">${safeText}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
const AUDIENCE_TYPES = ["public", "close_friends", "custom", "private"];
const STORY_TYPES = [
  {
    value: "text",
    label: "Text",
    icon: IoText,
  },
  {
    value: "image",
    label: "Photo",
    icon: IoImageOutline,
  },
  {
    value: "video",
    label: "Video",
    icon: IoVideocamOutline,
  },
  {
    value: "music",
    label: "Music",
    icon: IoMusicalNotesOutline,
  },
  {
    value: "voice",
    label: "Voice",
    icon: IoMicOutline,
  },
  {
    value: "multi_image",
    label: "Multi",
    icon: IoImagesOutline,
  },
  {
    value: "poll",
    label: "Poll",
    icon: IoStatsChartOutline,
  },
  {
    value: "question",
    label: "Question",
    icon: IoHelpCircleOutline,
  },
  {
    value: "link",
    label: "Link",
    icon: IoLinkOutline,
  },
  {
    value: "location",
    label: "Location",
    icon: IoLocationOutline,
  },
  {
    value: "countdown",
    label: "Countdown",
    icon: IoTimeOutline,
  },
  {
    value: "sticker",
    label: "Sticker",
    icon: IoSparklesOutline,
  },
  {
    value: "drawing",
    label: "Drawing",
    icon: IoCreateOutline,
  },
];

function StoryUploadModal({ onClose, onCreated, audienceUsers = [], chatId }) {
  const [step, setStep] = useState("type");
  const studioStep = { type: 1, edit: 2, settings: 3, preview: 4 }[step] || 1;
  const [storyType, setStoryType] = useState("text");
  const [text, setText] = useState("");
  const [caption, setCaption] = useState("");
  const [bgColor, setBgColor] = useState(COLORS[0]);
  const [font, setFont] = useState("serif");
  const [fontSize, setFontSize] = useState("24");
  const [textPosition, setTextPosition] = useState("center");
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [extraImages, setExtraImages] = useState([]);
  const [musicUrl, setMusicUrl] = useState("");
  const [musicTitle, setMusicTitle] = useState("");
  const [musicQuery, setMusicQuery] = useState("");
  const [musicResults, setMusicResults] = useState([]);
  const [musicSearching, setMusicSearching] = useState(false);
  const [voiceFile, setVoiceFile] = useState(null);
  const [filterName, setFilterName] = useState("");
  const [layout, setLayout] = useState("full");
  const [mood, setMood] = useState("");
  const [audience, setAudience] = useState("public");
  const [allowedUsers, setAllowedUsers] = useState([]);
  const [saveAsDraft, setSaveAsDraft] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [tags, setTags] = useState("");
  const [interactivePrompt, setInteractivePrompt] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("Open link");
  const [countdownAt, setCountdownAt] = useState("");
  const [countdownLabel, setCountdownLabel] = useState("Countdown");
  const [locationName, setLocationName] = useState("");
  const [locationLat, setLocationLat] = useState("");
  const [locationLng, setLocationLng] = useState("");
  const [locationCategory, setLocationCategory] = useState("travel");
  const [visitedAt, setVisitedAt] = useState("");
  const [locationStatus, setLocationStatus] = useState("");
  const [showStickerMaker, setShowStickerMaker] = useState(false);
  const [stickerEmoji, setStickerEmoji] = useState("✨");
  const [selectedSticker, setSelectedSticker] = useState(null);
  const [stickerCategory, setStickerCategory] = useState("Trending");
  const [stickerSearch, setStickerSearch] = useState("");
  const [apiStickers, setApiStickers] = useState([]);
  const [stickersLoading, setStickersLoading] = useState(false);
  const [customStickerFile, setCustomStickerFile] = useState(null);
  const [customStickerPreview, setCustomStickerPreview] = useState("");
  const [stickerForeground, setStickerForeground] = useState("#ffffff");
  const [stickerBackground, setStickerBackground] = useState("#3b5bff");
  const [stickerSize, setStickerSize] = useState(180);
  const [stickerRotation, setStickerRotation] = useState(0);
  const [drawingData, setDrawingData] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const fileInputRef = useRef(null);
  const voiceInputRef = useRef(null);
  const extraInputRef = useRef(null);
  const uploadControllerRef = useRef(null);
  const previewUrlsRef = useRef(new Set());

  useEffect(
    () => () => {
      if (uploadControllerRef.current) uploadControllerRef.current.abort();
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrlsRef.current.clear();
    },
    [],
  );

  useEffect(() => {
    if (storyType !== "sticker") return undefined;
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(async () => {
      if (active) setStickersLoading(true);
      try {
        const response = await aiService.getStickers(
          {
            q: stickerSearch.trim() || stickerCategory,
            limit: 48,
          },
          { signal: controller.signal },
        );
        const payload =
          response?.data?.data || response?.data || response || {};
        if (active) {
          setApiStickers(
            (payload.stickers || payload.sticker || []).filter((item) =>
              getStickerPreview(item),
            ),
          );
        }
      } catch {
        if (active) setApiStickers([]);
      } finally {
        if (active) setStickersLoading(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [storyType, stickerCategory, stickerSearch]);

  useEffect(() => {
    if (step === "type") {
      setAiSuggestions(null);
      setLoadingAI(true);
      storyService
        .getSuggestions()
        .then((d) => {
          setAiSuggestions(d.suggestions || d);
        })
        .catch(() => {})
        .finally(() => setLoadingAI(false));
    }
  }, [step]);

  const applyAICaption = () => {
    if (aiSuggestions?.captions?.length) {
      const c =
        aiSuggestions.captions[
          Math.floor(Math.random() * aiSuggestions.captions.length)
        ];
      setCaption(c.text || c);
    }
  };

  const applyAIEmojis = () => {
    if (aiSuggestions?.emojis?.length) {
      toast.info(
        `Suggested emojis: ${aiSuggestions.emojis.slice(0, 5).join(" ")}`,
      );
    }
  };

  const applyAIHashtags = () => {
    if (aiSuggestions?.hashtags?.length) {
      setTags(
        aiSuggestions.hashtags
          .map((h) => (typeof h === "string" ? h : h.tag || h.hashtag || ""))
          .map((h) => h.replace(/^#/, ""))
          .filter(Boolean)
          .slice(0, 5)
          .join(", "),
      );
    }
  };

  const applyAIBackground = () => {
    if (aiSuggestions?.backgrounds?.length) {
      const bg = aiSuggestions.backgrounds[0];
      setBgColor(bg.colors?.[0] || bg.color || bg.backgroundColor || COLORS[0]);
      if (bg.colors?.length > 1) {
        toast.info(`Suggested gradient: ${bg.colors.join(" → ")}`);
      }
    }
  };

  const applyAIFont = () => {
    if (aiSuggestions?.fonts?.length) {
      const sf = aiSuggestions.fonts[0];
      const matched = FONTS.find(
        (f) =>
          f.name.toLowerCase() === sf.name?.toLowerCase() ||
          f.value === sf.style,
      );
      if (matched) setFont(matched.value);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File too large. Max 50MB.");
      return;
    }
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview);
      previewUrlsRef.current.delete(mediaPreview);
    }
    const previewUrl = URL.createObjectURL(file);
    previewUrlsRef.current.add(previewUrl);
    setMediaFile(file);
    setMediaPreview(previewUrl);
  };

  const handleExtraImages = (e) => {
    const files = Array.from(e.target.files || []);
    setExtraImages((prev) => [
      ...prev,
      ...files.map((file, index) => {
        const url = URL.createObjectURL(file);
        previewUrlsRef.current.add(url);
        return { file, url, caption: "", order: prev.length + index };
      }),
    ]);
  };

  const handleMusicSearch = async () => {
    if (musicQuery.trim().length < 2 || musicSearching) return;
    setMusicSearching(true);
    try {
      const result = await storyService.searchMusic(musicQuery.trim());
      setMusicResults(result.songs || []);
    } catch {
      toast.error("Music search unavailable");
    } finally {
      setMusicSearching(false);
    }
  };

  const handleCancelUpload = () => {
    uploadControllerRef.current?.abort();
    setUploading(false);
    setUploadProgress(0);
  };

  const handleStickerCreated = (file) => {
    if (customStickerPreview) URL.revokeObjectURL(customStickerPreview);
    const preview = URL.createObjectURL(file);
    previewUrlsRef.current.add(preview);
    setCustomStickerFile(file);
    setCustomStickerPreview(preview);
    setSelectedSticker(null);
    setShowStickerMaker(false);
    toast.success("Sticker created");
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("Location is not supported by this browser.");
      return;
    }
    setLocationStatus("Requesting your location…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocationLat(String(coords.latitude));
        setLocationLng(String(coords.longitude));
        setLocationStatus(
          "Location attached. Add a place name for this memory.",
        );
      },
      () =>
        setLocationStatus(
          "Location permission was not granted. You can still add the place name manually.",
        ),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  };

  const handleCreateStory = async () => {
    if (uploading) return;
    uploadControllerRef.current = new AbortController();
    const totalFiles =
      Number(Boolean(mediaFile)) +
      Number(Boolean(voiceFile)) +
      Number(Boolean(customStickerFile)) +
      extraImages.filter((image) => image.file).length;
    let completedFiles = 0;
    const upload = async (file) => {
      const result = await storyService.uploadStoryFile(
        file,
        (progress) => {
          setUploadProgress(
            Math.min(
              99,
              Math.round(
                ((completedFiles + progress / 100) / Math.max(totalFiles, 1)) *
                  100,
              ),
            ),
          );
        },
        uploadControllerRef.current.signal,
      );
      completedFiles += 1;
      setUploadProgress(
        Math.round((completedFiles / Math.max(totalFiles, 1)) * 100),
      );
      return result;
    };
    setUploading(true);
    try {
      let mediaUrl = "";
      let mediaType = "";
      if (mediaFile) {
        const r = await upload(mediaFile);
        mediaUrl = r.url || r.data?.url || "";
        mediaType = mediaFile.type;
      }

      let voiceUrl = "";
      let voiceDuration = 0;
      if (voiceFile) {
        const r = await upload(voiceFile);
        voiceUrl = r.url || r.data?.url || "";
      }

      let stickerUrl = selectedSticker?.url || "";
      if (customStickerFile) {
        const r = await upload(customStickerFile);
        stickerUrl = r.url || r.data?.url || "";
      }
      if (storyType === "sticker" && !stickerUrl) {
        stickerUrl = createTextStickerDataUrl(
          stickerEmoji,
          stickerForeground,
          stickerBackground,
        );
      }

      const uploadedExtra = await Promise.all(
        extraImages.map(async (img, i) => {
          if (!img.file) return img;
          const r = await upload(img.file);
          return {
            url: r.url || r.data?.url || "",
            caption: img.caption,
            order: i,
          };
        }),
      );

      const typeMap = {
        image: "image",
        video: "video",
        music: "music",
        voice: "voice",
        multi_image: "multi_image",
        sticker: "sticker",
      };
      const storyData = {
        type: typeMap[storyType] || "text",
        content: {
          text: ["text", "music", "voice"].includes(storyType) ? text : "",
          caption: caption || undefined,
          backgroundColor: ["text", "music", "voice"].includes(storyType)
            ? bgColor
            : undefined,
          font: ["text", "music", "voice"].includes(storyType)
            ? font
            : undefined,
          fontSize: storyType === "text" ? fontSize : undefined,
          textPosition: storyType === "text" ? textPosition : undefined,
          mediaUrl,
          mediaType,
          musicUrl: musicUrl || undefined,
          musicTitle: musicTitle || undefined,
          voiceUrl: voiceUrl || undefined,
          voiceDuration: voiceDuration || undefined,
          stickers:
            storyType === "sticker"
              ? [
                  {
                    url: stickerUrl,
                    mediaType: customStickerFile?.type || selectedSticker?.mediaType || "image/png",
                    position: { x: 50, y: 50 },
                    size: Number(stickerSize),
                    rotation: Number(stickerRotation),
                  },
                ]
              : undefined,
          images: storyType === "multi_image" ? uploadedExtra : undefined,
          filterName: filterName || undefined,
          layout: layout || undefined,
          mood: mood || undefined,
          interactive: [
            "poll",
            "question",
            "link",
            "location",
            "countdown",
            "drawing",
          ].includes(storyType)
            ? {
                kind: storyType,
                prompt: interactivePrompt || undefined,
                options:
                  storyType === "poll"
                    ? pollOptions
                        .filter(Boolean)
                        .map((option) => ({ text: option.trim() }))
                    : undefined,
                linkUrl: storyType === "link" ? linkUrl : undefined,
                linkLabel: storyType === "link" ? linkLabel : undefined,
                countdownAt:
                  storyType === "countdown" ? countdownAt : undefined,
                countdownLabel:
                  storyType === "countdown" ? countdownLabel : undefined,
                drawingData: storyType === "drawing" ? drawingData : undefined,
              }
            : undefined,
        },
        audience: {
          type: audience,
          allowedUsers: audience === "custom" ? allowedUsers : [],
        },
        location:
          storyType === "location" && locationName
            ? {
                name: locationName,
                category: locationCategory,
                visitedAt: visitedAt || undefined,
                coordinates:
                  locationLat && locationLng
                    ? { lat: Number(locationLat), lng: Number(locationLng) }
                    : undefined,
              }
            : undefined,
        tags: tags
          ? tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
              .map((t) => `#${t.replace(/^#/, "")}`)
          : [],
        scheduling: scheduledAt
          ? { scheduledAt, isScheduled: true, status: "scheduled" }
          : undefined,
        isDraft: saveAsDraft || Boolean(scheduledAt),
      };

      const result = await storyService.createStory(storyData);
      toast.success("Story created!");
      onCreated?.(result.story);
      onClose();
    } catch (err) {
      if (err.name !== "CanceledError" && err.code !== "ERR_CANCELED") {
        toast.error(err.response?.data?.error || "Failed to create story");
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
      uploadControllerRef.current = null;
    }
  };

  return (
    <>
      {showStickerMaker && (
        <StickerMaker
          onClose={() => setShowStickerMaker(false)}
          onCreated={handleStickerCreated}
          chatId={chatId}
        />
      )}
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
        initial={{}}
        animate={{}}
        exit={{}}
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="Create story"
      >
        <motion.div
          className="relative w-full max-w-lg mx-4 bg-background dark:bg-background-dark rounded-2xl overflow-hidden border border-border dark:border-border-dark max-h-[90vh] flex flex-col"
          initial={{}}
          animate={{}}
          exit={{}}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex-shrink-0 border-b border-border dark:border-border-dark bg-white dark:bg-background-dark">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-2">
              <div className="min-w-0">
                <h2 className="text-2xl font-bold tracking-tight text-text-primary dark:text-text-primary-dark">
                  Create Story
                </h2>
                <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
                  Create and customize your story
                </p>
              </div>

              <button
                onClick={onClose}
                type="button"
                aria-label="Close"
                className=" flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-text-secondary dark:text-text-secondary-dark transition-all duration-200 hover:bg-hover/[0.08] dark:hover:bg-hover-dark/[0.08] hover:text-text-primary dark:hover:text-text-primary-dark active:scale-95"
              >
                <IoClose size={21} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-glass">
            <AnimatePresence mode="wait">
              {step === "type" && (
                <motion.div
                  key="type"
                  initial={{}}
                  animate={{}}
                  exit={{}}
                  className="px-5 py-2"
                >
                  <p className="text-lg text-text-secondary dark:text-text-secondary-dark mb">
                    What kind of story?
                  </p>
                  {loadingAI && (
                    <p className="text-sm text-text-secondary dark:text-text-secondary-dark mb-2 italic">
                      ✨ Loading AI suggestions...
                    </p>
                  )}
                  {aiSuggestions?.bestTime && (
                    <p className="text-xs text-primary dark:text-primary-dark mb-2">
                      ⏰ Best time to post: {aiSuggestions.bestTime.hour}:00{" "}
                      {aiSuggestions.bestTime.dayOfWeek} —{" "}
                      {aiSuggestions.bestTime.reason}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    {STORY_TYPES.map((t) => {
                      const Icon = t.icon;

                      return (
                        <motion.button
                          key={t.value}
                          type="button"
                          onClick={() => {
                            setStoryType(t.value);
                            setInteractivePrompt("");
                            setStep("edit");
                          }}
                          whileHover={{ y: -1 }}
                          whileTap={{ scale: 0.98 }}
                          transition={{ duration: 0.15, ease: "easeOut" }}
                          className="group relative flex h-14 items-center gap-4 rounded-xl border border-border/80 dark:border-border-dark/80 bg-surface dark:bg-surface-dark px-3 transition-all duration-200 hover:border-primary/30 hover:bg-primary/[0.03] hover:shadow-sm dark:hover:border-primary-dark/30 dark:hover:bg-primary-dark/[0.05]"
                        >
                          {/* Icon */}
                          <div className=" flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-accent-light dark:bg-accent-dark text-white transition-all duration-200 group-hover:scale-105">
                            <Icon size={20} strokeWidth={4} />
                          </div>

                          {/* Label */}
                          <span className=" min-w-0 flex-1 truncate text-left text-lg text-text-primary dark:text-text-primary-dark transition-colors duration-200 group-hover:text-primary dark:group-hover:text-primary-dark">
                            {t.label}
                          </span>

                          {/* Arrow */}
                          <span className=" flex-shrink-0 text-md text-text-secondary/50 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary/70 dark:group-hover:text-primary-dark/70">
                            <FaArrowRightLong size={14} />
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {step === "edit" && (
                <motion.div
                  key="edit"
                  initial={{}}
                  animate={{}}
                  exit={{}}
                  className="px-3 py-2 space-y-2"
                >
                  {/* AI Suggestions Bar */}
                  {aiSuggestions &&
                    (aiSuggestions.captions?.length ||
                      aiSuggestions.hashtags?.length ||
                      aiSuggestions.backgrounds?.length) && (
                      <div className="bg-surface dark:bg-surface-dark rounded-lg px-2 py-1.5 border border-border dark:border-border-dark">
                        <p className="text-sm font-medium text-purple-400 mb-2">
                          ✨ AI Suggestions
                        </p>
                        <div className="flex flex-wrap gap-1.5 px-2">
                          {aiSuggestions.captions?.length > 0 && (
                            <AIChip
                              label={`💬 Caption (${aiSuggestions.captions.length})`}
                              onClick={applyAICaption}
                            />
                          )}
                          {aiSuggestions.hashtags?.length > 0 && (
                            <AIChip
                              label={`# Hashtags (${aiSuggestions.hashtags.length})`}
                              onClick={applyAIHashtags}
                            />
                          )}
                          {aiSuggestions.emojis?.length > 0 && (
                            <AIChip
                              label={`😊 Emojis (${aiSuggestions.emojis.length})`}
                              onClick={applyAIEmojis}
                            />
                          )}
                          {aiSuggestions.backgrounds?.length > 0 && (
                            <AIChip
                              label={`🎨 Background`}
                              onClick={applyAIBackground}
                            />
                          )}
                          {aiSuggestions.fonts?.length > 0 && (
                            <AIChip label={`📝 Font`} onClick={applyAIFont} />
                          )}
                        </div>
                      </div>
                    )}

                  {/* Text Input */}
                  {["text", "music", "voice"].includes(storyType) && (
                    <div>
                      <label className="text-md text-text-secondary dark:text-text-secondary-dark font-medium uppercase tracking-wider mb-1.5 block">
                        Text
                      </label>
                      <div
                        className="w-full min-h-[180px] rounded-xl flex items-start justify-center px-2 pt-4 transition-colors"
                        style={{ backgroundColor: bgColor }}
                      >
                        <textarea
                          value={text}
                          onChange={(e) =>
                            setText(e.target.value.slice(0, 500))
                          }
                          placeholder="What's on your mind?"
                          className="w-full bg-transparent text-white text-center resize-none focus:outline-none placeholder-white/40 leading-normal scrollbar-hide"
                          style={{
                            fontFamily: font,
                            fontSize: `${fontSize}px`,
                          }}
                          rows={4}
                          maxLength={500}
                        />
                      </div>
                    </div>
                  )}

                  {[
                    "poll",
                    "question",
                    "link",
                    "location",
                    "countdown",
                    "sticker",
                    "drawing",
                  ].includes(storyType) && (
                    <InteractiveEditor
                      type={storyType}
                      prompt={interactivePrompt}
                      setPrompt={setInteractivePrompt}
                      options={pollOptions}
                      setOptions={setPollOptions}
                      linkUrl={linkUrl}
                      setLinkUrl={setLinkUrl}
                      linkLabel={linkLabel}
                      setLinkLabel={setLinkLabel}
                      countdownAt={countdownAt}
                      setCountdownAt={setCountdownAt}
                      countdownLabel={countdownLabel}
                      setCountdownLabel={setCountdownLabel}
                      locationName={locationName}
                      setLocationName={setLocationName}
                      locationLat={locationLat}
                      setLocationLat={setLocationLat}
                      locationLng={locationLng}
                      setLocationLng={setLocationLng}
                      locationCategory={locationCategory}
                      setLocationCategory={setLocationCategory}
                      visitedAt={visitedAt}
                      setVisitedAt={setVisitedAt}
                      locationStatus={locationStatus}
                      onUseCurrentLocation={handleUseCurrentLocation}
                      onOpenStickerMaker={() => setShowStickerMaker(true)}
                      stickerEmoji={stickerEmoji}
                      setStickerEmoji={setStickerEmoji}
                      selectedSticker={selectedSticker}
                      setSelectedSticker={setSelectedSticker}
                      stickerCategory={stickerCategory}
                      setStickerCategory={setStickerCategory}
                      stickerSearch={stickerSearch}
                      setStickerSearch={setStickerSearch}
                      apiStickers={apiStickers}
                      stickersLoading={stickersLoading}
                      customStickerPreview={customStickerPreview}
                      stickerForeground={stickerForeground}
                      setStickerForeground={setStickerForeground}
                      stickerBackground={stickerBackground}
                      setStickerBackground={setStickerBackground}
                      stickerSize={stickerSize}
                      setStickerSize={setStickerSize}
                      stickerRotation={stickerRotation}
                      setStickerRotation={setStickerRotation}
                      drawingData={drawingData}
                      setDrawingData={setDrawingData}
                    />
                  )}

                  {/* Caption */}
                  {storyType !== "multi_image" && (
                    <div>
                      <label className="text-[10px] text-text-secondary dark:text-text-secondary-dark font-medium uppercase tracking-wider mb-1.5 block">
                        Caption{" "}
                        {aiSuggestions?.captions?.length > 0 && (
                          <button
                            onClick={applyAICaption}
                            className="text-purple-400 normal-case ml-1"
                          >
                            ✨ suggest
                          </button>
                        )}
                      </label>
                      <input
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder="Add a caption..."
                        className="w-full px-3 py-2 rounded-xl bg-surface/80 dark:bg-surface-dark/80 border border-border dark:border-border-dark text-xs text-text-primary dark:text-text-primary-dark placeholder:text-placeholder dark:placeholder:text-placeholder-dark focus:outline-none focus:border-primary dark:focus:border-primary-dark"
                      />
                    </div>
                  )}

                  {/* Media Upload */}
                  {(storyType === "image" || storyType === "video") && (
                    <MediaUploadBlock
                      mediaPreview={mediaPreview}
                      mediaFile={mediaFile}
                      onSelect={() => fileInputRef.current?.click()}
                      onRemove={() => {
                        setMediaFile(null);
                        setMediaPreview(null);
                      }}
                      fileInputRef={fileInputRef}
                      handleFileSelect={handleFileSelect}
                    />
                  )}

                  {/* Multi Image */}
                  {storyType === "multi_image" && (
                    <MultiImageBlock
                      extraImages={extraImages}
                      onAdd={() => extraInputRef.current?.click()}
                      onRemove={(i) => {
                        const item = extraImages[i];
                        if (item?.url) {
                          URL.revokeObjectURL(item.url);
                          previewUrlsRef.current.delete(item.url);
                        }
                        setExtraImages((prev) =>
                          prev.filter((_, idx) => idx !== i),
                        );
                      }}
                      extraInputRef={extraInputRef}
                      handleExtraImages={handleExtraImages}
                    />
                  )}

                  {/* Music */}
                  {storyType === "music" && (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          value={musicQuery}
                          onChange={(e) => setMusicQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleMusicSearch();
                            }
                          }}
                          placeholder="Search songs"
                          className="min-w-0 flex-1 rounded-xl border border-border bg-surface/80 px-3 py-2 text-xs text-text-primary dark:border-border-dark dark:bg-surface-dark/80 dark:text-text-primary-dark"
                        />
                        <button
                          type="button"
                          onClick={handleMusicSearch}
                          disabled={musicSearching}
                          className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-on-primary disabled:opacity-50"
                        >
                          {musicSearching ? "…" : "Search"}
                        </button>
                      </div>
                      {musicResults.length > 0 && (
                        <div className="max-h-36 space-y-1 overflow-y-auto rounded-xl border border-border p-2 dark:border-border-dark">
                          {musicResults.map((song) => (
                            <button
                              key={`${song.source}-${song.id}`}
                              type="button"
                              disabled={!song.previewUrl}
                              onClick={() => {
                                setMusicUrl(song.previewUrl || "");
                                setMusicTitle(`${song.title} · ${song.artist}`);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg p-1.5 text-left hover:bg-hover/[0.07] disabled:opacity-50"
                            >
                              <div className="size-7 shrink-0 overflow-hidden rounded-md bg-primary/10">
                                {song.albumArt && (
                                  <img
                                    src={song.albumArt}
                                    alt=""
                                    className="size-full object-cover"
                                  />
                                )}
                              </div>
                              <span className="min-w-0 flex-1 truncate text-[11px] text-text-primary dark:text-text-primary-dark">
                                {song.title}
                                <span className="block truncate text-[9px] text-text-secondary dark:text-text-secondary-dark">
                                  {song.artist}
                                  {song.previewUrl
                                    ? ""
                                    : " · no preview available"}
                                </span>
                              </span>
                              <span className="text-[9px] text-primary">
                                {song.previewUrl ? "Select" : "Unavailable"}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                      <div>
                        <label className="text-[10px] text-text-secondary dark:text-text-secondary-dark font-medium uppercase tracking-wider mb-1.5 block">
                          Music URL
                        </label>
                        <input
                          value={musicUrl}
                          onChange={(e) => setMusicUrl(e.target.value)}
                          placeholder="https://..."
                          className="w-full px-3 py-2 rounded-xl bg-surface/80 dark:bg-surface-dark/80 border border-border dark:border-border-dark text-xs text-text-primary dark:text-text-primary-dark focus:outline-none focus:border-primary dark:focus:border-primary-dark"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-text-secondary dark:text-text-secondary-dark font-medium uppercase tracking-wider mb-1.5 block">
                          Song Title
                        </label>
                        <input
                          value={musicTitle}
                          onChange={(e) => setMusicTitle(e.target.value)}
                          placeholder="Song name..."
                          className="w-full px-3 py-2 rounded-xl bg-surface/80 dark:bg-surface-dark/80 border border-border dark:border-border-dark text-xs text-text-primary dark:text-text-primary-dark focus:outline-none focus:border-primary dark:focus:border-primary-dark"
                        />
                      </div>
                    </div>
                  )}

                  {/* Voice */}
                  {storyType === "voice" && (
                    <div>
                      <label className="text-[10px] text-text-secondary dark:text-text-secondary-dark font-medium uppercase tracking-wider mb-1.5 block">
                        Voice Recording
                      </label>
                      <button
                        onClick={() => voiceInputRef.current?.click()}
                        className="w-full py-8 rounded-xl border-2 border-dashed border-border dark:border-border-dark flex flex-col items-center gap-2 hover:border-primary/50 dark:hover:border-primary-dark/50 transition-colors"
                        type="button"
                      >
                        <div className="w-10 h-10 rounded-full bg-success dark:bg-success-dark flex items-center justify-center">
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="white"
                          >
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                          </svg>
                        </div>
                        <span className="text-xs text-text-secondary dark:text-text-secondary-dark">
                          {voiceFile
                            ? voiceFile.name
                            : "Upload voice recording"}
                        </span>
                      </button>
                      <input
                        ref={voiceInputRef}
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={(e) =>
                          setVoiceFile(e.target.files?.[0] || null)
                        }
                      />
                    </div>
                  )}

                  {/* Colors & Fonts (for text/music/voice) */}
                  {["text", "music", "voice"].includes(storyType) && (
                    <>
                      <ColorPicker
                        colors={COLORS}
                        selected={bgColor}
                        onChange={setBgColor}
                      />
                      <FontPicker
                        fonts={FONTS}
                        selected={font}
                        onChange={setFont}
                      />
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="text-[10px] text-text-secondary dark:text-text-secondary-dark font-medium uppercase tracking-wider mb-1.5 block">
                            Size
                          </label>
                          <div className="flex gap-1.5">
                            {["18", "24", "32", "40"].map((s) => (
                              <button
                                key={s}
                                onClick={() => setFontSize(s)}
                                className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${fontSize === s ? "border-primary dark:border-primary-dark bg-primary/10 dark:bg-primary-dark/10 text-primary dark:text-primary-dark" : "border-border dark:border-border-dark text-text-secondary dark:text-text-secondary-dark"}`}
                                type="button"
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] text-text-secondary dark:text-text-secondary-dark font-medium uppercase tracking-wider mb-1.5 block">
                            Position
                          </label>
                          <div className="flex gap-1.5">
                            {["top", "center", "bottom"].map((p) => (
                              <button
                                key={p}
                                onClick={() => setTextPosition(p)}
                                className={`px-3 py-1.5 rounded-lg text-xs border capitalize transition-colors ${textPosition === p ? "border-primary dark:border-primary-dark bg-primary/10 dark:bg-primary-dark/10 text-primary dark:text-primary-dark" : "border-border dark:border-border-dark text-text-secondary dark:text-text-secondary-dark"}`}
                                type="button"
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Filters */}
                  {storyType === "image" && (
                    <div>
                      <label className="text-[10px] text-text-secondary dark:text-text-secondary-dark font-medium uppercase tracking-wider mb-1.5 block">
                        Filter{" "}
                        {aiSuggestions?.filters?.length > 0 && (
                          <button
                            onClick={() => {
                              const f = aiSuggestions.filters[0];
                              setFilterName(f.name);
                            }}
                            className="text-purple-400 normal-case ml-1"
                          >
                            ✨ suggest
                          </button>
                        )}
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => setFilterName("")}
                          className={`px-2.5 py-1 rounded-lg text-[10px] border transition-colors ${!filterName ? "border-primary dark:border-primary-dark bg-primary/10 dark:bg-primary-dark/10 text-primary dark:text-primary-dark" : "border-border dark:border-border-dark text-text-secondary dark:text-text-secondary-dark"}`}
                          type="button"
                        >
                          None
                        </button>
                        {FILTERS.map((f) => (
                          <button
                            key={f}
                            onClick={() => setFilterName(f)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] border transition-colors ${filterName === f ? "border-primary dark:border-primary-dark bg-primary/10 dark:bg-primary-dark/10 text-primary dark:text-primary-dark" : "border-border dark:border-border-dark text-text-secondary dark:text-text-secondary-dark"}`}
                            type="button"
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Layout */}
                  {storyType === "text" && (
                    <div>
                      <label className="text-[10px] text-text-secondary dark:text-text-secondary-dark font-medium uppercase tracking-wider mb-1.5 block">
                        Layout{" "}
                        {aiSuggestions?.layouts?.length > 0 && (
                          <button
                            onClick={() => {
                              const l = aiSuggestions.layouts[0];
                              setLayout(l.preview || l.name);
                            }}
                            className="text-purple-400 normal-case ml-1"
                          >
                            ✨ suggest
                          </button>
                        )}
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {LAYOUTS.map((l) => (
                          <button
                            key={l}
                            onClick={() => setLayout(l)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] border capitalize transition-colors ${layout === l ? "border-primary dark:border-primary-dark bg-primary/10 dark:bg-primary-dark/10 text-primary dark:text-primary-dark" : "border-border dark:border-border-dark text-text-secondary dark:text-text-secondary-dark"}`}
                            type="button"
                          >
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mood */}
                  <div>
                    <label className="text-[10px] text-text-secondary dark:text-text-secondary-dark font-medium uppercase tracking-wider mb-1.5 block">
                      Mood{" "}
                      {aiSuggestions?.mood && (
                        <span className="text-purple-400 normal-case ml-1">
                          ✨ detected:{" "}
                          {displaySuggestionValue(aiSuggestions.mood)}
                        </span>
                      )}
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => setMood("")}
                        className={`px-2.5 py-1 rounded-lg text-[10px] border transition-colors ${!mood ? "border-primary dark:border-primary-dark bg-primary/10 dark:bg-primary-dark/10 text-primary dark:text-primary-dark" : "border-border dark:border-border-dark text-text-secondary dark:text-text-secondary-dark"}`}
                        type="button"
                      >
                        None
                      </button>
                      {MOODS.map((m) => (
                        <button
                          key={m}
                          onClick={() => setMood(m)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] border capitalize transition-colors ${mood === m ? "border-primary dark:border-primary-dark bg-primary/10 dark:bg-primary-dark/10 text-primary dark:text-primary-dark" : "border-border dark:border-border-dark text-text-secondary dark:text-text-secondary-dark"}`}
                          type="button"
                        >
                          {m === "joyful"
                            ? "😊"
                            : m === "romantic"
                              ? "❤️"
                              : m === "sad"
                                ? "😢"
                                : m === "energetic"
                                  ? "⚡"
                                  : m === "calm"
                                    ? "🌊"
                                    : m === "grateful"
                                      ? "🙏"
                                      : m === "excited"
                                        ? "🔥"
                                        : m === "thoughtful"
                                          ? "🤔"
                                          : "😄"}{" "}
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="text-[10px] text-text-secondary dark:text-text-secondary-dark font-medium uppercase tracking-wider mb-1.5 block">
                      Tags{" "}
                      {aiSuggestions?.hashtags?.length > 0 && (
                        <button
                          onClick={applyAIHashtags}
                          className="text-purple-400 normal-case ml-1"
                        >
                          ✨ generate
                        </button>
                      )}
                    </label>
                    <input
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="vibes, mood, daily (comma separated)"
                      className="w-full px-3 py-2 rounded-xl bg-surface/80 dark:bg-surface-dark/80 border border-border dark:border-border-dark text-xs text-text-primary dark:text-text-primary-dark placeholder:text-placeholder dark:placeholder:text-placeholder-dark focus:outline-none focus:border-primary dark:focus:border-primary-dark"
                    />
                  </div>

                  {/* Audience */}
                  <div>
                    <label className="text-[10px] text-text-secondary dark:text-text-secondary-dark font-medium uppercase tracking-wider mb-1.5 block">
                      Audience{" "}
                      {aiSuggestions?.privacy && (
                        <span className="text-purple-400 normal-case ml-1">
                          ✨ recommended:{" "}
                          {displaySuggestionValue(
                            aiSuggestions.privacy.recommended ??
                              aiSuggestions.privacy,
                          )}
                        </span>
                      )}
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {AUDIENCE_TYPES.map((a) => (
                        <button
                          key={a}
                          onClick={() => setAudience(a)}
                          className={`px-3 py-1.5 rounded-lg text-xs border capitalize transition-colors ${audience === a ? "border-primary dark:border-primary-dark bg-primary/10 dark:bg-primary-dark/10 text-primary dark:text-primary-dark" : "border-border dark:border-border-dark text-text-secondary dark:text-text-secondary-dark"}`}
                          type="button"
                        >
                          {a === "public"
                            ? "🌍"
                            : a === "close_friends"
                              ? "👥"
                              : a === "custom"
                                ? "✏️"
                                : "🔒"}{" "}
                          {a.replace("_", " ")}
                        </button>
                      ))}
                    </div>
                    {audience === "custom" && (
                      <div className="mt-2 max-h-28 overflow-y-auto space-y-1 rounded-xl border border-border dark:border-border-dark p-2">
                        {audienceUsers.length === 0 ? (
                          <p className="text-[10px] text-text-secondary">
                            No selectable contacts found
                          </p>
                        ) : (
                          audienceUsers.map((contact) => {
                            const selected = allowedUsers.includes(contact._id);
                            return (
                              <label
                                key={contact._id}
                                className="flex items-center gap-2 text-xs text-text-primary dark:text-text-primary-dark"
                              >
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={() =>
                                    setAllowedUsers((current) =>
                                      selected
                                        ? current.filter(
                                            (id) => id !== contact._id,
                                          )
                                        : [...current, contact._id],
                                    )
                                  }
                                />
                                <span className="truncate">
                                  {contact.username ||
                                    contact.fullName ||
                                    contact._id}
                                </span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>

                  <label className="flex items-center gap-2 text-xs text-text-secondary dark:text-text-secondary-dark">
                    <input
                      type="checkbox"
                      checked={saveAsDraft}
                      onChange={(e) => setSaveAsDraft(e.target.checked)}
                    />
                    Save as draft (only visible to you)
                  </label>
                  <label className="block text-[10px] text-text-secondary dark:text-text-secondary-dark">
                    Schedule for later (optional)
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      min={new Date(Date.now() + 60000)
                        .toISOString()
                        .slice(0, 16)}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="mt-1 w-full px-3 py-2 rounded-xl bg-surface/80 dark:bg-surface-dark/80 border border-border dark:border-border-dark text-xs text-text-primary dark:text-text-primary-dark"
                    />
                  </label>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <motion.button
                      onClick={() => setStep("type")}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-border dark:border-border-dark text-text-secondary dark:text-text-secondary-dark hover:bg-hover/[0.07] dark:hover:bg-hover-dark/[0.07] transition-colors"
                      type="button"
                    >
                      Back
                    </motion.button>
                    <motion.button
                      onClick={() => setStep("settings")}
                      disabled={
                        !hasStoryContent(storyType, {
                          text,
                          mediaFile,
                          musicUrl,
                          voiceFile,
                          extraImages,
                          interactivePrompt,
                          pollOptions,
                          linkUrl,
                          countdownAt,
                          locationName,
                          stickerEmoji,
                          drawingData,
                        })
                      }
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-primary dark:bg-primary-dark text-white disabled:opacity-50 transition-colors"
                      type="button"
                    >
                      Continue
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {step === "settings" && (
                <motion.div
                  key="settings"
                  initial={{}}
                  animate={{}}
                  exit={{}}
                  className="p-5 space-y-4"
                >
                  <div>
                    <p className="text-xs font-semibold text-text-primary dark:text-text-primary-dark">
                      Story settings
                    </p>
                    <p className="mt-1 text-[11px] text-text-secondary dark:text-text-secondary-dark">
                      Choose who can see this Story and when it should be
                      published.
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-surface p-3 dark:border-border-dark dark:bg-surface-dark">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-text-secondary dark:text-text-secondary-dark">
                      Audience
                    </p>
                    <p className="mt-1 text-sm font-semibold capitalize text-text-primary dark:text-text-primary-dark">
                      {audience.replace("_", " ")}
                    </p>
                    {audience === "custom" && (
                      <p className="mt-1 text-[11px] text-text-secondary dark:text-text-secondary-dark">
                        {allowedUsers.length} selected people
                      </p>
                    )}
                  </div>
                  <label className="flex items-center gap-2 text-xs text-text-secondary dark:text-text-secondary-dark">
                    <input
                      type="checkbox"
                      checked={saveAsDraft}
                      onChange={(e) => setSaveAsDraft(e.target.checked)}
                    />
                    Save as draft (only visible to you)
                  </label>
                  <label className="block text-[10px] text-text-secondary dark:text-text-secondary-dark">
                    Schedule for later (optional)
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      min={new Date(Date.now() + 60000)
                        .toISOString()
                        .slice(0, 16)}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-border bg-surface/80 px-3 py-2 text-xs text-text-primary dark:border-border-dark dark:bg-surface-dark/80 dark:text-text-primary-dark"
                    />
                  </label>
                  <div className="flex gap-2 pt-2">
                    <motion.button
                      onClick={() => setStep("edit")}
                      className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-hover/[0.07] dark:border-border-dark dark:text-text-secondary-dark dark:hover:bg-hover-dark/[0.07]"
                      type="button"
                    >
                      Back
                    </motion.button>
                    <motion.button
                      onClick={() => setStep("preview")}
                      className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-medium text-white transition-colors"
                      type="button"
                    >
                      Preview
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {step === "preview" && (
                <motion.div
                  key="preview"
                  initial={{}}
                  animate={{}}
                  exit={{}}
                  className="p-5 space-y-4"
                >
                  <div>
                    <p className="text-xs font-semibold text-text-primary dark:text-text-primary-dark">
                      Preview & publish
                    </p>
                    <p className="mt-1 text-[11px] text-text-secondary dark:text-text-secondary-dark">
                      Review your Story before sharing it.
                    </p>
                  </div>
                  <div
                    className="mx-auto flex min-h-[260px] w-full max-w-[260px] items-center justify-center overflow-hidden rounded-2xl p-5 text-center shadow-soft"
                    style={{ backgroundColor: bgColor }}
                  >
                    {mediaPreview ? (
                      mediaFile?.type?.startsWith("video/") ? (
                        <video
                          src={mediaPreview}
                          className="max-h-[260px] w-full object-contain"
                          controls
                        />
                      ) : (
                        <img
                          src={mediaPreview}
                          alt="Story preview"
                          className="max-h-[260px] w-full object-contain"
                        />
                      )
                    ) : extraImages.length > 0 ? (
                      <div className="grid w-full grid-cols-2 gap-1.5">
                        {extraImages.slice(0, 4).map((image, index) => (
                          <img
                            key={image.url || index}
                            src={image.url}
                            alt={`Preview ${index + 1}`}
                            className="aspect-square w-full rounded-lg object-cover"
                          />
                        ))}
                      </div>
                    ) : storyType === "sticker" && customStickerPreview ? (
                      customStickerFile?.type?.startsWith("video/") ? (
                        <video
                          src={customStickerPreview}
                          className="max-h-[260px] w-full object-contain"
                          autoPlay
                          loop
                          muted
                          playsInline
                        />
                      ) : (
                        <img
                          src={customStickerPreview}
                          alt="Sticker story preview"
                          className="max-h-[260px] w-full object-contain"
                        />
                      )
                    ) : (
                      <p
                        className="whitespace-pre-wrap break-words text-center text-white"
                        style={{ fontFamily: font, fontSize: `${fontSize}px` }}
                      >
                        {text || caption || "Your Story"}
                      </p>
                    )}
                  </div>
                  <div className="rounded-xl border border-border bg-surface p-3 text-xs dark:border-border-dark dark:bg-surface-dark">
                    <div className="flex items-center justify-between">
                      <span className="text-text-secondary dark:text-text-secondary-dark">
                        Audience
                      </span>
                      <span className="font-semibold capitalize text-text-primary dark:text-text-primary-dark">
                        {audience.replace("_", " ")}
                      </span>
                    </div>
                    {scheduledAt && (
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-text-secondary dark:text-text-secondary-dark">
                          Schedule
                        </span>
                        <span className="font-semibold text-text-primary dark:text-text-primary-dark">
                          {new Date(scheduledAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <motion.button
                      onClick={() => setStep("settings")}
                      className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-hover/[0.07] dark:border-border-dark dark:text-text-secondary-dark dark:hover:bg-hover-dark/[0.07]"
                      type="button"
                    >
                      Back
                    </motion.button>
                    <motion.button
                      onClick={
                        uploading ? handleCancelUpload : handleCreateStory
                      }
                      disabled={uploading && uploadProgress >= 100}
                      className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-medium text-white disabled:opacity-50"
                      type="button"
                    >
                      {uploading
                        ? `Uploading ${uploadProgress}%`
                        : scheduledAt
                          ? "Schedule Story"
                          : saveAsDraft
                            ? "Save Draft"
                            : "Publish Story"}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}

function hasStoryContent(type, values) {
  if (
    [
      "poll",
      "question",
      "link",
      "location",
      "countdown",
      "sticker",
      "drawing",
    ].includes(type)
  ) {
    if (type === "poll")
      return Boolean(
        values.interactivePrompt.trim() &&
        values.pollOptions.filter(Boolean).length >= 2,
      );
    if (type === "question") return Boolean(values.interactivePrompt.trim());
    if (type === "link") return Boolean(values.linkUrl.trim());
    if (type === "location") return Boolean(values.locationName.trim());
    if (type === "countdown") return Boolean(values.countdownAt);
    if (type === "drawing") return Boolean(values.drawingData);
    return Boolean(values.stickerEmoji);
  }
  return Boolean(
    values.text ||
    values.mediaFile ||
    values.musicUrl ||
    values.voiceFile ||
    values.extraImages.length,
  );
}

function displaySuggestionValue(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number")
    return String(value);
  if (typeof value === "object") {
    if (value.detected != null) return String(value.detected);
    if (value.recommended != null) return String(value.recommended);
    if (value.name != null) return String(value.name);
    return Object.values(value)
      .filter((item) => typeof item === "string" || typeof item === "number")
      .join(" · ");
  }
  return "";
}

function InteractiveEditor({
  type,
  prompt,
  setPrompt,
  options,
  setOptions,
  linkUrl,
  setLinkUrl,
  linkLabel,
  setLinkLabel,
  countdownAt,
  setCountdownAt,
  countdownLabel,
  setCountdownLabel,
  locationName,
  setLocationName,
  locationLat,
  setLocationLat,
  locationLng,
  setLocationLng,
  locationCategory,
  setLocationCategory,
  visitedAt,
  setVisitedAt,
  locationStatus,
  onUseCurrentLocation,
  onOpenStickerMaker,
  stickerEmoji,
  setStickerEmoji,
  selectedSticker,
  setSelectedSticker,
  stickerCategory,
  setStickerCategory,
  stickerSearch,
  setStickerSearch,
  apiStickers,
  stickersLoading,
  customStickerPreview,
  stickerForeground,
  setStickerForeground,
  stickerBackground,
  setStickerBackground,
  stickerSize,
  setStickerSize,
  stickerRotation,
  setStickerRotation,
  drawingData,
  setDrawingData,
}) {
  const label = {
    poll: "Poll",
    question: "Question",
    link: "Link",
    location: "Location",
    countdown: "Countdown",
    sticker: "Sticker",
    drawing: "Drawing",
  }[type];
  return (
    <div className="space-y-1 rounded-xl border border-border bg-surface/70 px-3 py-1.5 dark:border-border-dark dark:bg-surface-dark/70">
      <p className="text-sm font-semibold uppercase tracking-wider text-text-secondary dark:text-text-secondary-dark">
        {label} Story
      </p>
      {["poll", "question"].includes(type) && (
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value.slice(0, 500))}
          placeholder={
            type === "poll" ? "Ask a poll question" : "Ask your audience"
          }
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark outline-none focus:border-primary-hover-dark focus:ring-2 focus:ring-primary/20 focus:shadow-sm dark:text-text-primary-da dark:focus:border-gray-500 dark:focus:ring-primary/20 dark:focus:shadow-sm"
        />
      )}
      {type === "poll" && (
        <div className="space-y-1">
          {options.map((option, index) => (
            <div key={index} className="flex gap-2">
              <input
                value={option}
                onChange={(e) =>
                  setOptions(
                    options.map((item, i) =>
                      i === index ? e.target.value.slice(0, 120) : item,
                    ),
                  )
                }
                placeholder={`Option ${index + 1}`}
                className="min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition-all duration-2 placeholder:text-text-secondary/ focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-sm dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-da dark:focus:border-gray-500 dark:focus:ring-primary/20 dark:focus:shadow-sm"
              />
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() =>
                    setOptions(options.filter((_, i) => i !== index))
                  }
                  className="text-danger"
                  aria-label="Remove option"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {options.length < 8 && (
            <button
              type="button"
              onClick={() => setOptions([...options, ""])}
              className="text-[11px] font-medium text-primary dark:text-primary-dark"
            >
              + Add option
            </button>
          )}
        </div>
      )}
      {type === "link" && (
        <>
          <input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            type="url"
            placeholder="https://example.com"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark outline-none transition-all duration-2 placeholder:text-text-secondary/ focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-sm dark:text-text-primary-da dark:focus:border-gray-500 dark:focus:ring-primary/20 dark:focus:shadow-sm"
          />
          <input
            value={linkLabel}
            onChange={(e) => setLinkLabel(e.target.value.slice(0, 100))}
            placeholder="Button label"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark outline-none transition-all duration-2 placeholder:text-text-secondary/ focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-sm dark:text-text-primary-da dark:focus:border-gray-500 dark:focus:ring-primary/20 dark:focus:shadow-sm"
          />
        </>
      )}
      {type === "location" && (
        <div className="space-y-2">
          <input
            value={locationName}
            onChange={(e) => setLocationName(e.target.value.slice(0, 200))}
            placeholder="Location name"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark outline-none transition-all duration-2 placeholder:text-text-secondary/ focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-sm dark:text-text-primary-da dark:focus:border-gray-500 dark:focus:ring-primary/20 dark:focus:shadow-sm"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onUseCurrentLocation}
              className="flex gap-1 rounded-full border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
            >
              <MdOutlineLocationOn size={12} /> Use current location
            </button>
            {locationStatus && (
              <span className="text-[11px] text-text-secondary dark:text-text-secondary-dark">
                {locationStatus}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={locationCategory}
              onChange={(e) => setLocationCategory(e.target.value)}
              className="min-w-0 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark outline-none transition-all duration-2 placeholder:text-text-secondary/ focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-sm dark:text-text-primary-da dark:focus:border-gray-500 dark:focus:ring-primary/20 dark:focus:shadow-sm"
            >
              <option value="travel">Travel</option>
              <option value="food">Food</option>
              <option value="nature">Nature</option>
              <option value="family">Family</option>
              <option value="work">Work</option>
              <option value="memory">Memory</option>
            </select>
            <input
              value={visitedAt}
              onChange={(e) => setVisitedAt(e.target.value)}
              type="date"
              aria-label="Visit date"
              className="min-w-0 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark"
            />
          </div>
          <p className="text-[11px] text-text-secondary dark:text-text-secondary-dark">
            Add a caption below to share what made this place memorable.
            Coordinates are optional and never need to be typed manually.
          </p>
        </div>
      )}
      {type === "countdown" && (
        <>
          <input
            value={countdownLabel}
            onChange={(e) => setCountdownLabel(e.target.value.slice(0, 100))}
            placeholder="Countdown title"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark outline-none transition-all duration-2 placeholder:text-text-secondary/ focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-sm dark:text-text-primary-da dark:focus:border-gray-500 dark:focus:ring-primary/20 dark:focus:shadow-sm"
          />
          <input
            value={countdownAt}
            min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
            onChange={(e) => setCountdownAt(e.target.value)}
            type="datetime-local"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark"
          />
        </>
      )}
      {type === "sticker" && (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2 -mt-2">
            <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
              Choose from the same Emotune sticker set used in chat
            </p>
            <button
              type="button"
              onClick={onOpenStickerMaker}
              className="rounded-full bg-primary px-2 py-1.5 text-sm -mt-2 font-semibold text-white"
            >
              Create sticker
            </button>
          </div>
          <input
            value={stickerSearch}
            onChange={(event) => setStickerSearch(event.target.value)}
            placeholder="Search stickers"
            aria-label="Search stickers"
            className="h-9 w-full rounded-full border border-border bg-surface px-3 text-sm text-text-primary outline-none focus:border-primary dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark"
          />
          {stickersLoading && (
            <p className="text-center text-xs text-text-secondary">
              Loading stickers…
            </p>
          )}
          <div className="flex w-full min-w-0 gap-2 overflow-x-auto overflow-y-hidden whitespace-nowrap pb-1 scrollbar-hide">
            {STICKER_CATEGORIES.map((category) => (
              <button
                type="button"
                key={category}
                onClick={() => setStickerCategory(category)}
                className={`flex-none rounded-full border px-3 py-1 text-[11px] ${stickerCategory === category ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="grid max-h-44 grid-cols-5 gap-2 overflow-y-auto scrollbar-hide">
            {(apiStickers.length
              ? apiStickers
              : getFallbackStickers(stickerCategory, 100)
            ).map((sticker) => {
              const url = getStickerPreview(sticker);
              return (
                <button
                  type="button"
                  key={sticker.id}
                  onClick={() => setSelectedSticker(sticker)}
                  className={`rounded-xl border p-1 ${selectedSticker?.id === sticker.id ? "border-primary bg-primary/10" : "border-border dark:border-border-dark"}`}
                >
                  <img
                    src={url}
                    alt={sticker.title}
                    className="aspect-square w-full object-contain"
                  />
                </button>
              );
            })}
          </div>
          {customStickerPreview && (
            <img
              src={customStickerPreview}
              alt="Custom sticker preview"
              className="mx-auto size-24 rounded-xl object-contain"
            />
          )}
        </div>
      )}
      {type === "drawing" && (
        <DrawingPad value={drawingData} onChange={setDrawingData} />
      )}
    </div>
  );
}

function DrawingPad({ value, onChange }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const pointsRef = useRef([]);
  const draw = (event) => {
    if (!drawingRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const context = canvas.getContext("2d");
    const point = [
      (event.clientX - rect.left) * (canvas.width / rect.width),
      (event.clientY - rect.top) * (canvas.height / rect.height),
    ];
    pointsRef.current = [...pointsRef.current, point];
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawSmoothPath(context, pointsRef.current, { color: "#3B5BFF", size: 4, opacity: 1 });
    onChange(canvas.toDataURL("image/png"));
  };
  return (
    <div>
      <canvas
        ref={canvasRef}
        width="600"
        height="320"
        className="h-48 w-full touch-none rounded-xl border border-border bg-white dark:border-border-dark"
        onPointerDown={(event) => {
          drawingRef.current = true;
          pointsRef.current = [];
          const context = canvasRef.current.getContext("2d");
          const rect = canvasRef.current.getBoundingClientRect();
          pointsRef.current = [[
            (event.clientX - rect.left) * (canvasRef.current.width / rect.width),
            (event.clientY - rect.top) * (canvasRef.current.height / rect.height),
          ]];
          context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          drawSmoothPath(context, pointsRef.current, { color: "#3B5BFF", size: 4, opacity: 1 });
        }}
        onPointerMove={draw}
        onPointerUp={() => {
          drawingRef.current = false;
        }}
        onPointerLeave={() => {
          drawingRef.current = false;
        }}
        aria-label="Draw Story"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            const context = canvasRef.current.getContext("2d");
            pointsRef.current = [];
            context.clearRect(
              0,
              0,
              canvasRef.current.width,
              canvasRef.current.height,
            );
            onChange("");
          }}
          className="mt-2 text-[11px] text-danger"
        >
          Clear drawing
        </button>
      )}
    </div>
  );
}

function AIChip({ label, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      className="text-xs px-1.5 py-1 rounded-md bg-purple-500/10 border border-purple-500/30 text-foreground dark:text-foreground-dark hover:bg-purple-500/20 transition-colors"
      type="button"
    >
      {label}
    </motion.button>
  );
}

function ColorPicker({ colors, selected, onChange }) {
  return (
    <div>
      <label className="text-[10px] text-text-secondary dark:text-text-secondary-dark font-medium uppercase tracking-wider mb-1.5 block">
        Background Color
      </label>
      <div className="flex flex-wrap gap-2">
        {colors.map((c) => (
          <motion.button
            key={c}
            onClick={() => onChange(c)}
            className={`h-8 w-8 rounded-full border-2 transition-colors ${selected === c ? "border-white ring-2 ring-primary/40 dark:ring-primary-dark/40" : "border-transparent"}`}
            style={{ backgroundColor: c }}
            type="button"
          />
        ))}
      </div>
    </div>
  );
}

function FontPicker({ fonts, selected, onChange }) {
  return (
    <div>
      <label className="text-[10px] text-text-secondary dark:text-text-secondary-dark font-medium uppercase tracking-wider mb-1.5 block">
        Font Style
      </label>
      <div className="flex flex-wrap gap-1.5">
        {fonts.map((f) => (
          <button
            key={f.name}
            onClick={() => onChange(f.value)}
            className={`px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${selected === f.value ? "border-primary dark:border-primary-dark bg-primary/10 dark:bg-primary-dark/10 text-primary dark:text-primary-dark" : "border-border dark:border-border-dark text-text-secondary dark:text-text-secondary-dark hover:bg-hover/[0.07] dark:hover:bg-hover-dark/[0.07]"}`}
            style={{ fontFamily: f.value }}
            type="button"
          >
            {f.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function MediaUploadBlock({
  mediaPreview,
  mediaFile,
  onSelect,
  onRemove,
  fileInputRef,
  handleFileSelect,
}) {
  return (
    <div>
      <label className="text-[10px] text-text-secondary dark:text-text-secondary-dark font-medium uppercase tracking-wider mb-1.5 block">
        Media
      </label>
      {mediaPreview ? (
        <div className="w-full min-h-[180px] rounded-xl overflow-hidden mb-2 bg-black/10 flex items-center justify-center relative">
          {mediaFile?.type?.startsWith("video/") ? (
            <video
              src={mediaPreview}
              className="w-full max-h-[180px] object-contain"
              controls
            />
          ) : (
            <img
              src={mediaPreview}
              alt=""
              className="w-full max-h-[180px] object-contain"
            />
          )}
          <button
            onClick={onRemove}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-white text-xs"
            type="button"
          >
            ✕
          </button>
        </div>
      ) : (
        <div
          onClick={onSelect}
          className="w-full min-h-[120px] rounded-xl border-2 border-dashed border-border dark:border-border-dark flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/50 dark:hover:border-primary-dark/50 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-primary dark:bg-primary-dark flex items-center justify-center">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <span className="text-xs text-text-secondary dark:text-text-secondary-dark">
            Upload Photo or Video
          </span>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}

function MultiImageBlock({
  extraImages,
  onAdd,
  onRemove,
  extraInputRef,
  handleExtraImages,
}) {
  return (
    <div>
      <label className="text-[10px] text-text-secondary dark:text-text-secondary-dark font-medium uppercase tracking-wider mb-1.5 block">
        Images ({extraImages.length})
      </label>
      <div className="grid grid-cols-3 gap-2">
        {extraImages.map((img, i) => (
          <div
            key={i}
            className="relative aspect-square rounded-lg overflow-hidden bg-black/10"
          >
            <img src={img.url} alt="" className="w-full h-full object-cover" />
            <button
              onClick={() => onRemove(i)}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center text-white text-[8px]"
              type="button"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          onClick={onAdd}
          className="aspect-square rounded-lg border-2 border-dashed border-border dark:border-border-dark flex items-center justify-center hover:border-primary/50 dark:hover:border-primary-dark/50 transition-colors"
          type="button"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#4B5563"
            strokeWidth="2"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
      <input
        ref={extraInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleExtraImages}
      />
    </div>
  );
}

export default StoryUploadModal;
