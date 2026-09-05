export const REACTIONS = Object.freeze(["\u{1F44D}", "\u2764\uFE0F", "\u{1F602}", "\u{1F62E}", "\u{1F622}", "\u{1F64F}"]);

export const MEDIA_TYPES = new Set(["image", "video", "gif"]);
export const AUDIO_TYPES = new Set(["audio", "voice"]);
export const FILE_TYPES = new Set(["file", "document"]);
export const CHROMELESS_TYPES = new Set(["sticker", "emoji"]);

export const MEDIA_FILE_PATTERN = /\.(avif|bmp|gif|heic|heif|jpe?g|png|svg|webp|mp4|m4v|mov|mpeg|webm|mp3|m4a|aac|ogg|opus|wav|flac)$/i;

export const PREVIEWABLE_DOCUMENTS = new Set(["PDF", "TXT", "CSV"]);

export const FILE_KIND_STYLES = Object.freeze({
  pdf: { color: "#DC2626", background: "#DC262624", label: "PDF" },
  word: { color: "#3B5BFF", background: "#3B5BFF24", label: "WORD" },
  sheet: { color: "#16A34A", background: "#16A34A24", label: "SHEET" },
  slides: { color: "#D97706", background: "#D9770624", label: "SLIDES" },
  archive: { color: "#7C3AED", background: "#7C3AED24", label: "ARCHIVE" },
  file: { color: "#4B5563", background: "#4B556324", label: "FILE" },
});

export const BUBBLE_TRANSITION = Object.freeze({ duration: 0.14, ease: "easeOut" });
