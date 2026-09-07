const Joi = require('joi');

const EDITOR_LIMITS = Object.freeze({
  version: 1,
  maxJsonBytes: 512 * 1024,
  maxObjects: 80,
  maxGroupChildren: 40,
  maxDrawingPoints: 4000,
  maxKeyframes: 60,
  maxTextLength: 500,
  minCanvasSize: 16,
  maxCanvasSize: 2048,
  maxProjectDuration: 60_000,
  maxAnimationDuration: 10_000,
  maxTags: 12,
});

const STICKER_ASSET_TYPES = ['static', 'animated'];
const STICKER_SOURCES = ['studio', 'import'];
const STICKER_VISIBILITIES = ['private', 'unlisted'];
const STICKER_OBJECT_TYPES = ['image', 'text', 'shape', 'drawing', 'group'];
const BLEND_MODES = ['source-over', 'multiply', 'screen', 'overlay', 'darken', 'lighten'];
const MASK_TYPES = ['none', 'circle', 'rounded', 'heart', 'star'];
const BRUSH_TYPES = ['pen', 'pencil', 'marker', 'highlighter', 'eraser'];
const EASING_NAMES = ['linear', 'easeIn', 'easeOut', 'easeInOut', 'cubic', 'back', 'bounce'];
const TEXT_ALIGNS = ['left', 'center', 'right'];

// Only http(s) and app-relative paths survive. blob:, data:, javascript: and
// file: references are rejected outright so a stored project can never make a
// viewer's browser fetch something the server never vouched for.
const ASSET_URL_PATTERN = /^(https?:\/\/[^\s"'<>\\]+|\/[^\s"'<>\\]*)$/;
const COLOR_PATTERN = /^(#[0-9a-fA-F]{3,8}|transparent|rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(,\s*[\d.]+\s*)?\))$/;

const objectId = Joi.string().min(1).max(80).pattern(/^[A-Za-z0-9_.:-]+$/);
const colorValue = Joi.string().max(64).pattern(COLOR_PATTERN);
const assetUrl = Joi.string().max(2048).pattern(ASSET_URL_PATTERN);
const coordinate = Joi.number().min(-20_000).max(20_000);
const extent = Joi.number().min(0).max(20_000);
const unitScalar = Joi.number().min(0).max(1);
const timeValue = Joi.number().min(0).max(EDITOR_LIMITS.maxProjectDuration);

const keyframeSchema = Joi.object({
  time: timeValue.required(),
  x: coordinate,
  y: coordinate,
  scale: Joi.number().min(-100).max(100),
  scaleX: Joi.number().min(-100).max(100),
  scaleY: Joi.number().min(-100).max(100),
  rotation: Joi.number().min(-36_000).max(36_000),
  opacity: unitScalar,
  blur: Joi.number().min(0).max(100),
  easing: Joi.string().valid(...EASING_NAMES),
});

const animationSchema = Joi.object({
  enabled: Joi.boolean().default(false),
  duration: Joi.number().min(1).max(EDITOR_LIMITS.maxAnimationDuration).default(2000),
  keyframes: Joi.array().items(keyframeSchema).max(EDITOR_LIMITS.maxKeyframes).default([]),
});

// Crop is stored as a normalised source rectangle so it survives resizing and
// is applied identically by the preview and the export renderer.
const cropSchema = Joi.object({
  x: unitScalar.required(),
  y: unitScalar.required(),
  width: Joi.number().greater(0).max(1).required(),
  height: Joi.number().greater(0).max(1).required(),
});

const filtersSchema = Joi.object({
  brightness: Joi.number().min(0).max(3),
  contrast: Joi.number().min(0).max(3),
  saturation: Joi.number().min(0).max(3),
  blur: Joi.number().min(0).max(40),
  grayscale: unitScalar,
  sepia: unitScalar,
});

const drawingPoint = Joi.array().ordered(coordinate.required(), coordinate.required()).length(2);

const commonObjectKeys = {
  id: objectId.required(),
  name: Joi.string().allow('').max(120),
  type: Joi.string().valid(...STICKER_OBJECT_TYPES).required(),
  x: coordinate.required(),
  y: coordinate.required(),
  width: extent.required(),
  height: extent.required(),
  rotation: Joi.number().min(-36_000).max(36_000).default(0),
  scaleX: Joi.number().min(-100).max(100).default(1),
  scaleY: Joi.number().min(-100).max(100).default(1),
  opacity: unitScalar.default(1),
  blendMode: Joi.string().valid(...BLEND_MODES).default('source-over'),
  blur: Joi.number().min(0).max(100),
  flipX: Joi.boolean().default(false),
  flipY: Joi.boolean().default(false),
  visible: Joi.boolean().default(true),
  locked: Joi.boolean().default(false),
  startTime: timeValue.default(0),
  endTime: timeValue.allow(null).default(null),
  mask: Joi.string().valid(...MASK_TYPES).default('none'),
  animation: animationSchema,
};

const typeSpecificKeys = {
  // image
  src: assetUrl,
  assetId: Joi.string().max(120),
  sourceType: Joi.string().valid('remote', 'indexeddb', 'upload', 'sticker'),
  assetUnavailable: Joi.boolean(),
  crop: cropSchema,
  filters: filtersSchema,
  // text
  text: Joi.string().allow('').max(EDITOR_LIMITS.maxTextLength),
  fontFamily: Joi.string().max(120),
  fontSize: Joi.number().min(1).max(1000),
  fontWeight: Joi.alternatives(Joi.number().min(100).max(900), Joi.string().valid('normal', 'bold')),
  fontStyle: Joi.string().valid('normal', 'italic'),
  textAlign: Joi.string().valid(...TEXT_ALIGNS),
  lineHeight: Joi.number().min(0.5).max(4),
  letterSpacing: Joi.number().min(-40).max(200),
  textStroke: colorValue,
  textStrokeWidth: Joi.number().min(0).max(80),
  emoji: Joi.string().max(32),
  emojiId: Joi.string().max(80),
  // shape
  shape: Joi.string().max(40).pattern(/^[A-Za-z]+$/),
  stroke: colorValue,
  strokeWidth: Joi.number().min(0).max(200),
  // drawing
  points: Joi.array().items(drawingPoint).max(EDITOR_LIMITS.maxDrawingPoints),
  size: Joi.number().min(0.5).max(400),
  brushType: Joi.string().valid(...BRUSH_TYPES),
  lineCap: Joi.string().valid('butt', 'round', 'square'),
  lineJoin: Joi.string().valid('bevel', 'round', 'miter'),
  smoothing: unitScalar,
  erase: Joi.boolean(),
  // shared
  color: colorValue,
};

const childObjectSchema = Joi.object({
  ...commonObjectKeys,
  ...typeSpecificKeys,
  type: Joi.string().valid('image', 'text', 'shape', 'drawing').required(),
});

const objectSchema = Joi.object({
  ...commonObjectKeys,
  ...typeSpecificKeys,
  children: Joi.array().items(childObjectSchema).max(EDITOR_LIMITS.maxGroupChildren),
});

const REQUIRED_BY_TYPE = {
  image: [],
  text: ['text'],
  shape: ['shape'],
  drawing: ['points'],
  group: ['children'],
};

const canvasSchema = Joi.object({
  width: Joi.number().integer().min(EDITOR_LIMITS.minCanvasSize).max(EDITOR_LIMITS.maxCanvasSize).required(),
  height: Joi.number().integer().min(EDITOR_LIMITS.minCanvasSize).max(EDITOR_LIMITS.maxCanvasSize).required(),
  background: Joi.alternatives(Joi.string().valid('transparent'), colorValue).default('transparent'),
});

const effectsSchema = Joi.object({
  outline: Joi.object({
    enabled: Joi.boolean().default(false),
    color: colorValue.default('#ffffff'),
    width: Joi.number().min(0).max(64).default(8),
  }).default(),
  shadow: Joi.object({
    enabled: Joi.boolean().default(false),
    color: colorValue.default('#000000'),
    blur: Joi.number().min(0).max(100).default(12),
    offsetX: Joi.number().min(-200).max(200).default(0),
    offsetY: Joi.number().min(-200).max(200).default(5),
    opacity: unitScalar.default(0.3),
  }).default(),
}).default();

const editorStateSchema = Joi.object({
  version: Joi.number().valid(EDITOR_LIMITS.version).required(),
  name: Joi.string().allow('').max(120).default('Untitled Sticker'),
  canvas: canvasSchema.required(),
  objects: Joi.array().items(objectSchema).max(EDITOR_LIMITS.maxObjects).required(),
  effects: effectsSchema,
  duration: Joi.number().min(0).max(EDITOR_LIMITS.maxProjectDuration).default(3000),
  fps: Joi.number().integer().min(1).max(60).default(30),
});

function missingTypeKeys(object) {
  return (REQUIRED_BY_TYPE[object.type] || []).filter((key) => object[key] === undefined || object[key] === null);
}

// Returns { ok, error, value }. Kept separate from the Joi schema so payload
// size and per-type shape are checked before anything is persisted.
function validateEditorState(input) {
  if (input === undefined || input === null) return { ok: true, value: null };

  let raw = input;
  if (typeof raw === 'string') {
    if (Buffer.byteLength(raw, 'utf8') > EDITOR_LIMITS.maxJsonBytes) {
      return { ok: false, status: 413, error: 'Sticker editor state is too large' };
    }
    try {
      raw = JSON.parse(raw);
    } catch {
      return { ok: false, status: 422, error: 'Sticker editor state is not valid JSON' };
    }
  } else if (Buffer.byteLength(JSON.stringify(raw ?? null), 'utf8') > EDITOR_LIMITS.maxJsonBytes) {
    return { ok: false, status: 413, error: 'Sticker editor state is too large' };
  }

  const { error, value } = editorStateSchema.validate(raw, { abortEarly: true, convert: true, stripUnknown: false });
  if (error) return { ok: false, status: 422, error: `Invalid editor state: ${error.details[0].message}` };

  const objects = [...value.objects, ...value.objects.flatMap((object) => object.children || [])];
  const invalid = objects.find((object) => missingTypeKeys(object).length > 0);
  if (invalid) {
    return { ok: false, status: 422, error: `Invalid editor state: ${invalid.type} object is missing ${missingTypeKeys(invalid).join(', ')}` };
  }
  const duplicate = value.objects.map((object) => object.id).find((id, index, all) => all.indexOf(id) !== index);
  if (duplicate) return { ok: false, status: 422, error: 'Invalid editor state: duplicate object id' };

  return { ok: true, value };
}

const tagsField = Joi.alternatives(
  Joi.array().items(Joi.string().trim().min(1).max(40)).max(EDITOR_LIMITS.maxTags),
  Joi.string().allow('').max(600),
);

// Ownership and timestamps are never accepted from the client: they are derived
// from the authenticated session and from Mongoose timestamps.
const stickerCreateSchema = Joi.object({
  title: Joi.string().trim().min(1).max(120).default('Untitled Sticker'),
  description: Joi.string().trim().allow('').max(500).default(''),
  tags: tagsField.default([]),
  assetType: Joi.string().valid(...STICKER_ASSET_TYPES).default('static'),
  visibility: Joi.string().valid(...STICKER_VISIBILITIES).default('private'),
  source: Joi.string().valid(...STICKER_SOURCES).default('studio'),
  duration: Joi.number().min(0).max(EDITOR_LIMITS.maxAnimationDuration).default(0),
  editorState: Joi.any(),
  objectAssetIds: Joi.alternatives(Joi.array().items(objectId).max(12), Joi.string().allow('').max(1200)).default([]),
  clientMutationId: Joi.string().trim().max(64).allow(''),
});

const stickerUpdateSchema = Joi.object({
  title: Joi.string().trim().min(1).max(120),
  description: Joi.string().trim().allow('').max(500),
  tags: tagsField,
  visibility: Joi.string().valid(...STICKER_VISIBILITIES),
  assetType: Joi.string().valid(...STICKER_ASSET_TYPES),
  duration: Joi.number().min(0).max(EDITOR_LIMITS.maxAnimationDuration),
  editorState: Joi.any(),
  objectAssetIds: Joi.alternatives(Joi.array().items(objectId).max(12), Joi.string().allow('').max(1200)),
  clientMutationId: Joi.string().trim().max(64).allow(''),
}).min(1);

function normalizeTags(value) {
  const list = Array.isArray(value) ? value : String(value || '').split(',');
  const tags = list.map((tag) => String(tag).trim()).filter(Boolean).slice(0, EDITOR_LIMITS.maxTags);
  return [...new Set(tags.map((tag) => tag.slice(0, 40)))];
}

function normalizeObjectAssetIds(value) {
  const list = Array.isArray(value) ? value : String(value || '').split(',');
  return list.map((id) => String(id).trim()).filter(Boolean).slice(0, 12);
}

function isSafeAssetUrl(value) {
  return typeof value === 'string' && value.length <= 2048 && ASSET_URL_PATTERN.test(value);
}

module.exports = {
  EDITOR_LIMITS,
  STICKER_ASSET_TYPES,
  STICKER_SOURCES,
  STICKER_VISIBILITIES,
  STICKER_OBJECT_TYPES,
  BRUSH_TYPES,
  editorStateSchema,
  validateEditorState,
  stickerCreateSchema,
  stickerUpdateSchema,
  normalizeTags,
  normalizeObjectAssetIds,
  isSafeAssetUrl,
};
