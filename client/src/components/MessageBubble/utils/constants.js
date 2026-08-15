export const REACTIONS = Object.freeze(["\u{1F44D}", "\u2764\uFE0F", "\u{1F602}", "\u{1F62E}", "\u{1F622}", "\u{1F64F}"]);

export const MEDIA_TYPES = new Set(["image", "video", "gif"]);
export const AUDIO_TYPES = new Set(["audio", "voice"]);
export const FILE_TYPES = new Set(["file", "document"]);
export const CHROMELESS_TYPES = new Set(["sticker", "emoji"]);

export const MEDIA_FILE_PATTERN = /\.(avif|bmp|gif|heic|heif|jpe?g|png|svg|webp|mp4|m4v|mov|mpeg|webm|mp3|m4a|aac|ogg|opus|wav|flac)$/i;

export const PREVIEWABLE_DOCUMENTS = new Set(["PDF", "TXT", "CSV"]);

export const FILE_KIND_STYLES = Object.freeze({
  pdf: { color: "var(--color-danger)", background: "rgb(var(--color-danger) / 0.14)", label: "PDF" },
  word: { color: "var(--color-primary)", background: "rgb(var(--color-primary) / 0.14)", label: "WORD" },
  sheet: { color: "var(--color-success)", background: "rgb(var(--color-success) / 0.14)", label: "SHEET" },
  slides: { color: "var(--color-warning)", background: "rgb(var(--color-warning) / 0.14)", label: "SLIDES" },
  archive: { color: "var(--color-ai)", background: "rgb(var(--color-ai) / 0.14)", label: "ARCHIVE" },
  file: { color: "var(--color-text-secondary)", background: "rgb(var(--color-text-secondary) / 0.14)", label: "FILE" },
});

export const BUBBLE_TRANSITION = Object.freeze({ duration: 0.14, ease: "easeOut" });
