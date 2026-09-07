import {
  MAX_STICKER_OBJECTS,
  STICKER_CANVAS_SIZE,
  createPngBlob,
  createStudioObject,
  deserializeStickerProject,
  renderCompositionAtTime,
  validatePngBlob,
} from "./stickerStudioEngine.js";

/**
 * Turns a live Sticker Studio project into what the server will accept, and
 * renders the files that go with it.
 *
 * The server validates the editor project against a strict whitelist and
 * rejects unknown keys, blob:/data: URLs and out-of-range numbers. Doing that
 * translation here - clamping instead of failing - means a save never dies with
 * a 422 after the user already waited for an export.
 */
export const SERVER_EDITOR_VERSION = 1;
const MAX_DRAWING_POINTS = 4000;
const MAX_GROUP_CHILDREN = 40;
const MAX_LAYER_UPLOADS = 12;
const RASTERIZE_MAX_EDGE = 1024;

const COLOR_PATTERN = /^(#[0-9a-fA-F]{3,8}|transparent|rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(,\s*[\d.]+\s*)?\))$/;
const ASSET_URL_PATTERN = /^(https?:\/\/[^\s"'<>\\]+|\/[^\s"'<>\\]*)$/;
const OBJECT_ID_PATTERN = /^[A-Za-z0-9_.:-]+$/;

const NUMBER_RANGES = {
  x: [-20000, 20000], y: [-20000, 20000], width: [0, 20000], height: [0, 20000],
  rotation: [-36000, 36000], scaleX: [-100, 100], scaleY: [-100, 100],
  opacity: [0, 1], blur: [0, 100], startTime: [0, 60000],
  fontSize: [1, 1000], lineHeight: [0.5, 4], letterSpacing: [-40, 200],
  textStrokeWidth: [0, 80], strokeWidth: [0, 200], size: [0.5, 400], smoothing: [0, 1],
};

const ENUMS = {
  blendMode: ["source-over", "multiply", "screen", "overlay", "darken", "lighten"],
  mask: ["none", "circle", "rounded", "heart", "star"],
  brushType: ["pen", "pencil", "marker", "highlighter", "eraser"],
  lineCap: ["butt", "round", "square"],
  lineJoin: ["bevel", "round", "miter"],
  textAlign: ["left", "center", "right"],
  fontStyle: ["normal", "italic"],
  sourceType: ["remote", "indexeddb", "upload", "sticker"],
};

const BOOLEANS = ["flipX", "flipY", "visible", "locked", "erase", "assetUnavailable"];
const COLOR_KEYS = ["color", "stroke", "textStroke"];
const STRING_LIMITS = { name: 120, text: 500, fontFamily: 120, emoji: 32, emojiId: 80, assetId: 120 };
const OBJECT_TYPES = ["image", "text", "shape", "drawing", "group"];

const CHILD_TYPES = OBJECT_TYPES.filter((type) => type !== "group");
const REQUIRED_FALLBACKS = { text: ["text", ""], shape: ["shape", "rectangle"], drawing: ["points", []], group: ["children", []] };

const finiteNumber = (value) => (typeof value === "number" && Number.isFinite(value) ? value : null);
const clamp = (value, [min, max]) => {
  const number = finiteNumber(value);
  return number === null ? undefined : Math.min(max, Math.max(min, number));
};
const clampInt = (value, min, max) => {
  const number = clamp(value, [min, max]);
  return number === undefined ? undefined : Math.round(number);
};
const cleanString = (value, max) => (typeof value === "string" ? value.slice(0, max) : undefined);
const cleanColor = (value) => (typeof value === "string" && COLOR_PATTERN.test(value) ? value.slice(0, 64) : undefined);
const cleanEnum = (value, allowed) => (allowed.includes(value) ? value : undefined);
const cleanUrl = (value) => (typeof value === "string" && value.length <= 2048 && ASSET_URL_PATTERN.test(value) ? value : undefined);
const cleanId = (value) => (typeof value === "string" && value.length > 0 && value.length <= 80 && OBJECT_ID_PATTERN.test(value) ? value : undefined);

const put = (target, key, value) => {
  if (value !== undefined) target[key] = value;
};

// Keyframes are dropped rather than repaired when they carry no usable time:
// an interpolation frame without a time cannot be placed on the timeline.
function sanitizeAnimation(animation) {
  if (!animation || typeof animation !== "object") return undefined;
  const keyframes = (Array.isArray(animation.keyframes) ? animation.keyframes : [])
    .map((frame) => {
      const time = clamp(frame?.time, [0, 60000]);
      if (time === undefined) return null;
      const output = { time };
      ["x", "y"].forEach((key) => put(output, key, clamp(frame[key], [-20000, 20000])));
      ["scale", "scaleX", "scaleY"].forEach((key) => put(output, key, clamp(frame[key], [-100, 100])));
      put(output, "rotation", clamp(frame.rotation, [-36000, 36000]));
      put(output, "opacity", clamp(frame.opacity, [0, 1]));
      put(output, "blur", clamp(frame.blur, [0, 100]));
      put(output, "easing", cleanEnum(frame.easing, ["linear", "easeIn", "easeOut", "easeInOut", "cubic", "back", "bounce"]));
      return output;
    })
    .filter(Boolean)
    .slice(0, 60);
  return { enabled: Boolean(animation.enabled), duration: clamp(animation.duration, [1, 10000]) ?? 2000, keyframes };
}

// A crop is only meaningful when all four normalised edges survive, so a
// partial one is dropped instead of guessing the missing side.
function sanitizeCrop(crop) {
  if (!crop || typeof crop !== "object") return undefined;
  const x = clamp(crop.x, [0, 1]);
  const y = clamp(crop.y, [0, 1]);
  const width = clamp(crop.width, [0, 1]);
  const height = clamp(crop.height, [0, 1]);
  if ([x, y, width, height].some((value) => value === undefined) || width <= 0 || height <= 0) return undefined;
  return { x, y, width, height };
}

function sanitizeFilters(filters) {
  if (!filters || typeof filters !== "object") return undefined;
  const output = {};
  ["brightness", "contrast", "saturation"].forEach((key) => put(output, key, clamp(filters[key], [0, 3])));
  put(output, "blur", clamp(filters.blur, [0, 40]));
  ["grayscale", "sepia"].forEach((key) => put(output, key, clamp(filters[key], [0, 1])));
  return Object.keys(output).length ? output : undefined;
}

function sanitizePoints(points) {
  if (!Array.isArray(points)) return undefined;
  return points
    .map((point) => {
      const x = clamp(Array.isArray(point) ? point[0] : undefined, [-20000, 20000]);
      const y = clamp(Array.isArray(point) ? point[1] : undefined, [-20000, 20000]);
      return x === undefined || y === undefined ? null : [x, y];
    })
    .filter(Boolean)
    .slice(0, MAX_DRAWING_POINTS);
}

function sanitizeFontWeight(value) {
  if (typeof value === "string") return cleanEnum(value, ["normal", "bold"]);
  return clamp(value, [100, 900]);
}

/**
 * Copies one editor object into its server-safe shape.
 *
 * Everything not on the whitelist - `file`, `originalSrc`, `backgroundRemoved`,
 * `attribution` and friends - stays client-side. Layers whose bytes travel as
 * `objectAssets` deliberately carry no `src`: the server fills in the URL it
 * owns once the upload lands.
 */
function sanitizeObject(object, { allowGroup = false, uploadedIds = new Set() } = {}) {
  const id = cleanId(object?.id);
  const type = cleanEnum(object?.type, allowGroup ? OBJECT_TYPES : CHILD_TYPES);
  if (!id || !type) return null;

  const output = { id, type };
  output.x = clamp(object.x, NUMBER_RANGES.x) ?? 0;
  output.y = clamp(object.y, NUMBER_RANGES.y) ?? 0;
  output.width = clamp(object.width, NUMBER_RANGES.width) ?? 0;
  output.height = clamp(object.height, NUMBER_RANGES.height) ?? 0;

  Object.entries(NUMBER_RANGES).forEach(([key, range]) => {
    if (["x", "y", "width", "height"].includes(key)) return;
    put(output, key, clamp(object[key], range));
  });
  BOOLEANS.forEach((key) => {
    if (typeof object[key] === "boolean") output[key] = object[key];
  });
  COLOR_KEYS.forEach((key) => put(output, key, cleanColor(object[key])));
  Object.entries(STRING_LIMITS).forEach(([key, max]) => put(output, key, cleanString(object[key], max)));
  Object.entries(ENUMS).forEach(([key, allowed]) => put(output, key, cleanEnum(object[key], allowed)));
  put(output, "fontWeight", sanitizeFontWeight(object.fontWeight));
  put(output, "animation", sanitizeAnimation(object.animation));
  if (object.endTime === null) output.endTime = null;
  else put(output, "endTime", clamp(object.endTime, [0, 60000]));
  if (typeof object.shape === "string" && /^[A-Za-z]+$/.test(object.shape)) output.shape = object.shape.slice(0, 40);

  if (type === "image") {
    put(output, "crop", sanitizeCrop(object.crop));
    put(output, "filters", sanitizeFilters(object.filters));
    output.sourceType = output.sourceType || "remote";
    if (uploadedIds.has(id)) {
      delete output.src;
      delete output.assetUnavailable;
    } else {
      const src = cleanUrl(object.src);
      if (src) output.src = src;
      else {
        delete output.src;
        output.assetUnavailable = true;
      }
    }
  }
  if (type === "drawing") output.points = sanitizePoints(object.points) || [];
  if (type === "group") {
    output.children = (Array.isArray(object.children) ? object.children : [])
      .map((child) => sanitizeObject(child, { uploadedIds }))
      .filter(Boolean)
      .slice(0, MAX_GROUP_CHILDREN);
  }
  const [requiredKey, fallback] = REQUIRED_FALLBACKS[type] || [];
  if (requiredKey && (output[requiredKey] === undefined || output[requiredKey] === null)) output[requiredKey] = fallback;
  return output;
}

function sanitizeEffects(effects) {
  const outline = effects?.outline || {};
  const shadow = effects?.shadow || {};
  return {
    outline: {
      enabled: Boolean(outline.enabled),
      color: cleanColor(outline.color) || "#ffffff",
      width: clamp(outline.width, [0, 64]) ?? 8,
    },
    shadow: {
      enabled: Boolean(shadow.enabled),
      color: cleanColor(shadow.color) || "#000000",
      blur: clamp(shadow.blur, [0, 100]) ?? 12,
      offsetX: clamp(shadow.offsetX, [-200, 200]) ?? 0,
      offsetY: clamp(shadow.offsetY, [-200, 200]) ?? 5,
      opacity: clamp(shadow.opacity, [0, 1]) ?? 0.3,
    },
  };
}

/**
 * The studio project as the server's editorState whitelist accepts it.
 *
 * `uploadedIds` are the object ids whose image bytes accompany the save as
 * `objectAssets`. Duplicate ids are dropped because the server treats them as a
 * corrupt project rather than deduplicating.
 */
export function toServerEditorState(project, { uploadedIds = new Set() } = {}) {
  const background = project?.canvas?.background;
  const seen = new Set();
  const objects = (Array.isArray(project?.objects) ? project.objects : [])
    .map((object) => sanitizeObject(object, { allowGroup: true, uploadedIds }))
    .filter((object) => {
      if (!object || seen.has(object.id)) return false;
      seen.add(object.id);
      return true;
    })
    .slice(0, MAX_STICKER_OBJECTS);

  return {
    version: SERVER_EDITOR_VERSION,
    name: cleanString(project?.name, 120) || "Untitled Sticker",
    canvas: {
      width: clampInt(project?.canvas?.width, 16, 2048) ?? STICKER_CANVAS_SIZE,
      height: clampInt(project?.canvas?.height, 16, 2048) ?? STICKER_CANVAS_SIZE,
      background: background === "transparent" ? "transparent" : cleanColor(background) || "transparent",
    },
    objects,
    effects: sanitizeEffects(project?.effects),
    duration: clamp(project?.duration, [0, 60000]) ?? 3000,
    fps: clampInt(project?.fps, 1, 60) ?? 30,
  };
}

const CLOUDINARY_SRC = /^https:\/\/res\.cloudinary\.com\//;
const isServerOwned = (src) => typeof src === "string" && (src.startsWith("/uploads/") || CLOUDINARY_SRC.test(src));

/**
 * The inverse of `toServerEditorState`: a stored project made editable again.
 *
 * A record written by an older client can be missing keys the studio now
 * expects, so every object is rehydrated through `createStudioObject` before the
 * engine's own migration runs - one object model, one set of defaults. Layers
 * the server refused to keep come back flagged `assetUnavailable`, which the
 * canvas already draws as a placeholder rather than a broken image.
 */
export function fromServerEditorState(editorState) {
  const hydrate = (object) => {
    const restored = createStudioObject(object?.type || "shape", object || {});
    if (Array.isArray(object?.children)) restored.children = object.children.map(hydrate);
    return restored;
  };
  const objects = (Array.isArray(editorState?.objects) ? editorState.objects : []).map(hydrate);
  return deserializeStickerProject({ ...editorState, version: SERVER_EDITOR_VERSION, objects });
}

/** Image layers a reopened project could not restore, for an honest warning. */
export function countUnavailableLayers(project) {
  let missing = 0;
  eachImageLayer(project, (object) => {
    if (object.assetUnavailable || !object.src) missing += 1;
  });
  return missing;
}
const layerBytes = (object) => (object?.file instanceof Blob ? object.file : null);

function eachImageLayer(project, visit) {
  (Array.isArray(project?.objects) ? project.objects : []).forEach((object) => {
    if (object?.type === "image") visit(object);
    (Array.isArray(object?.children) ? object.children : []).forEach((child) => {
      if (child?.type === "image") visit(child);
    });
  });
}

// Re-encodes an already-loaded image so a stock or catalogue layer survives the
// save as a server-owned file. A cross-origin image without CORS taints the
// canvas, so the export is attempted and the layer is left behind on failure.
async function rasterizeImage(image) {
  if (!image?.complete || !image.naturalWidth) return null;
  const scale = Math.min(1, RASTERIZE_MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  try {
    return await createPngBlob(canvas);
  } catch {
    return null;
  }
}

/**
 * Pairs every image layer that needs storing with its editor object id.
 *
 * Layers already hosted by this server are skipped. Layers that carry their own
 * bytes are taken first because a URL-only layer can still be recovered by
 * re-rendering, while a blob: layer would be lost for good.
 */
export async function collectLayerUploads(project, imageCache = new Map()) {
  const layers = [];
  eachImageLayer(project, (object) => layers.push(object));
  const ordered = [...layers.filter(layerBytes), ...layers.filter((object) => !layerBytes(object))];
  const uploads = [];
  const seen = new Set();

  for (const object of ordered) {
    if (uploads.length >= MAX_LAYER_UPLOADS) break;
    const objectId = cleanId(object.id);
    if (!objectId || seen.has(objectId) || isServerOwned(object.src)) continue;
    const bytes = layerBytes(object) || (await rasterizeImage(imageCache.get(object.src)));
    if (!bytes) continue;
    const name = bytes instanceof File ? bytes.name : `${objectId}.png`;
    uploads.push({ objectId, file: new File([bytes], name, { type: bytes.type || "image/png" }) });
    seen.add(objectId);
  }
  return uploads;
}

/**
 * Renders one frame of the project to a PNG File.
 *
 * This is the same `renderCompositionAtTime` the canvas preview uses, so what a
 * user saves is what they were looking at.
 */
export async function renderProjectToPngFile(project, {
  time = 0,
  imageCache = new Map(),
  fileName = `sticker-${Date.now()}.png`,
  requireTransparency = project?.canvas?.background === "transparent",
} = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = project.canvas.width;
  canvas.height = project.canvas.height;
  renderCompositionAtTime(canvas.getContext("2d"), project, time, { imageCache });
  const blob = await createPngBlob(canvas);
  await validatePngBlob(blob, canvas.width, canvas.height, { requireTransparency });
  return new File([blob], fileName, { type: "image/png" });
}

const trimmedTitle = (value, fallback) => {
  const title = String(value ?? "").trim() || String(fallback ?? "").trim();
  return (title || "Untitled Sticker").slice(0, 120);
};

/**
 * Everything one save needs: the flat asset, a thumbnail when the asset is not
 * an image, the per-layer source files, and the whitelisted editor project.
 *
 * Pass `assetFile` to reuse an export the user already waited for (the WebM from
 * an animated export, for instance); otherwise the current frame is rendered.
 */
export async function buildStickerSavePayload({
  project,
  imageCache = new Map(),
  assetFile = null,
  thumbnailFile = null,
  time = 0,
  title,
  description,
  tags,
  visibility = "private",
  source = "studio",
  clientMutationId,
} = {}) {
  const objectAssets = await collectLayerUploads(project, imageCache);
  const editorState = toServerEditorState(project, {
    uploadedIds: new Set(objectAssets.map((entry) => entry.objectId)),
  });
  const asset = assetFile || (await renderProjectToPngFile(project, { time, imageCache }));
  const isImageAsset = String(asset.type || "").startsWith("image/");
  const thumbnail = thumbnailFile || (isImageAsset
    ? null
    : await renderProjectToPngFile(project, {
      time,
      imageCache,
      fileName: "sticker-thumb.png",
      requireTransparency: false,
    }));

  return {
    asset,
    thumbnail,
    objectAssets,
    editorState,
    title: trimmedTitle(title, project?.name),
    description: description ?? "",
    tags: tags ?? [],
    visibility,
    source,
    duration: isImageAsset ? 0 : Math.min(10000, Math.max(0, Math.round(editorState.duration))),
    clientMutationId,
  };
}

