export const STICKER_CANVAS_SIZE = 512;
// One definition of the alignment grid, in canvas units, so the grid the
// workspace paints and the grid a drag snaps to are provably the same grid.
export const STICKER_GRID_STEP = 32;
export const MAX_STICKER_OBJECTS = 80;
export const MAX_ANIMATION_DURATION = 10000;
export const DEFAULT_FPS = 30;
// The brush configurations the studio offers, defined once beside the renderer
// that interprets them: `drawSmoothPath` reads `brushType` for grain, weight and
// blending, so a preset is only the size and opacity a style starts at. Two
// copies of this list is how a style ended up clearing the opacity it set.
export const BRUSH_PRESETS = [
  { id: "pencil", label: "Pencil", size: 5, opacity: 1 },
  { id: "marker", label: "Marker", size: 12, opacity: 1 },
  { id: "highlighter", label: "Highlighter", size: 24, opacity: 0.45 },
];

export const EASINGS = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => 1 - ((1 - t) * (1 - t)),
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2),
  cubic: (t) => t * t * t,
  back: (t) => { const c = 1.70158; return (c + 1) * t * t * t - c * t * t; },
  bounce: (t) => { const n = 7.5625; const d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) { const x = t - 1.5 / d; return n * x * x + 0.75; } if (t < 2.5 / d) { const x = t - 2.25 / d; return n * x * x + 0.9375; } const x = t - 2.625 / d; return n * x * x + 0.984375; },
};

export function makeStudioId(prefix = "object") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createStudioObject(type, values = {}) {
  return {
    id: makeStudioId(type),
    name: `${type[0].toUpperCase()}${type.slice(1)}`,
    type,
    x: STICKER_CANVAS_SIZE / 2,
    y: STICKER_CANVAS_SIZE / 2,
    width: 160,
    height: 120,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    blendMode: "source-over",
    flipX: false,
    flipY: false,
    visible: true,
    locked: false,
    startTime: 0,
    endTime: null,
    mask: "none",
    animation: { enabled: false, duration: 2000, keyframes: [] },
    ...values,
  };
}

export function createStudioProject(values = {}) {
  return {
    version: 1,
    name: "Untitled Sticker",
    canvas: { width: STICKER_CANVAS_SIZE, height: STICKER_CANVAS_SIZE, background: "transparent" },
    objects: [],
    effects: {
      outline: { enabled: false, color: "#ffffff", width: 8 },
      shadow: { enabled: false, color: "#000000", blur: 12, offsetX: 0, offsetY: 5, opacity: 0.3 },
    },
    duration: 3000,
    fps: DEFAULT_FPS,
    ...values,
  };
}

function finiteNumber(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function sanitizeDrawingObject(object, index = 0) {
  const points = Array.isArray(object?.points)
    ? object.points.filter((point) => Array.isArray(point) && point.length >= 2)
      .map(([x, y]) => [finiteNumber(x), finiteNumber(y)])
    : [];
  if (!points.length) return null;
  return {
    ...createStudioObject("drawing"),
    ...object,
    id: object.id || makeStudioId("drawing"),
    name: object.name || `Drawing ${index + 1}`,
    type: "drawing",
    points,
    color: typeof object.color === "string" ? object.color : "#3b5bff",
    size: Math.max(1, finiteNumber(object.size, 8)),
    opacity: Math.min(1, Math.max(0, finiteNumber(object.opacity, 1))),
    brushType: object.brushType || "pencil",
    lineCap: object.lineCap || "round",
    lineJoin: object.lineJoin || "round",
    smoothing: Math.min(1, Math.max(0, finiteNumber(object.smoothing, 0.55))),
    width: Math.max(1, finiteNumber(object.width, 160)),
    height: Math.max(1, finiteNumber(object.height, 120)),
    x: finiteNumber(object.x, STICKER_CANVAS_SIZE / 2),
    y: finiteNumber(object.y, STICKER_CANVAS_SIZE / 2),
    visible: object.visible !== false,
    locked: object.locked === true,
    mask: object.mask || "none",
    animation: object.animation || { enabled: false, duration: 2000, keyframes: [] },
  };
}

function migrateLegacyPath(path, index = 0) {
  const points = Array.isArray(path?.points)
    ? path.points.filter((point) => Array.isArray(point) && point.length >= 2)
      .map(([x, y]) => [finiteNumber(x), finiteNumber(y)])
    : [];
  if (!points.length) return null;
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const padding = Math.max(1, finiteNumber(path.size, 8) / 2);
  const left = Math.min(...xs) - padding;
  const right = Math.max(...xs) + padding;
  const top = Math.min(...ys) - padding;
  const bottom = Math.max(...ys) + padding;
  const x = (left + right) / 2;
  const y = (top + bottom) / 2;
  return sanitizeDrawingObject({
    ...path,
    id: path.id || makeStudioId("drawing"),
    name: path.name || `Drawing ${index + 1}`,
    x, y,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
    points: points.map(([px, py]) => [px - x, py - y]),
    brushType: path.brushType || "pencil",
    erase: path.mode === "erase",
  }, index);
}

export function migrateDrawingData(project) {
  const legacy = Array.isArray(project?.paths) ? project.paths : [];
  const objects = Array.isArray(project?.objects) ? project.objects : [];
  const { paths: _legacyPaths, ...withoutLegacyPaths } = project || {};
  return {
    ...withoutLegacyPaths,
    objects: [...legacy.map(migrateLegacyPath).filter(Boolean), ...objects.map((object, index) => object?.type === "drawing" ? sanitizeDrawingObject(object, index) : object).filter(Boolean)],
  };
}

export function createDrawingObjectFromPoints(points, values = {}) {
  const valid = (points || []).filter((point) => Array.isArray(point) && point.length >= 2).map(([x, y]) => [finiteNumber(x), finiteNumber(y)]);
  if (!valid.length) return null;
  const halfSize = Math.max(1, finiteNumber(values.size, 8) / 2);
  const xs = valid.map(([x]) => x); const ys = valid.map(([, y]) => y);
  const left = Math.min(...xs) - halfSize; const right = Math.max(...xs) + halfSize;
  const top = Math.min(...ys) - halfSize; const bottom = Math.max(...ys) + halfSize;
  const x = (left + right) / 2; const y = (top + bottom) / 2;
  return sanitizeDrawingObject({
    ...values,
    type: "drawing",
    name: values.name || "Drawing",
    x, y,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
    points: valid.map(([px, py]) => [px - x, py - y]),
  });
}

export function cloneProject(project) {
  return JSON.parse(JSON.stringify(project));
}

export function serializeStickerProject(project) {
  const copy = cloneProject(project);
  delete copy.paths;
  copy.objects = copy.objects.map((object) => {
    const result = { ...object };
    delete result.file;
    if (typeof result.src === "string" && result.src.startsWith("blob:")) {
      result.assetUnavailable = true;
      delete result.src;
    }
    if (result.children) {
      result.children = result.children.map((child) => { const next = { ...child }; delete next.file; if (next.src?.startsWith("blob:")) delete next.src; return next; });
    }
    return result;
  });
  return JSON.stringify(copy);
}

export function deserializeStickerProject(value) {
  let parsed;
  try {
    parsed = typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    throw new Error("The selected file is not valid JSON");
  }

  // Lottie exports use a different schema (v/fr/ip/op/w/layers) and cannot be
  // reconstructed as editable Sticker Studio objects without a Lottie renderer.
  // Detect them explicitly so users get an actionable error instead of the
  // misleading generic project-validation message.
  if (parsed && Array.isArray(parsed.layers) && (parsed.v || parsed.fr !== undefined || parsed.op !== undefined)) {
    throw new Error("This is a Lottie animation JSON, not a Sticker Studio project. Export a .stickerproject.json from Sticker Studio, or add the animation through the sticker picker.");
  }

  if (!parsed || parsed.version !== 1 || (!Array.isArray(parsed.objects) && !Array.isArray(parsed.paths))) {
    throw new Error("Invalid Sticker Studio project. Use a .stickerproject.json exported from Sticker Studio.");
  }
  const defaults = createStudioProject();
  return migrateDrawingData({
    ...defaults,
    ...parsed,
    canvas: { ...defaults.canvas, ...parsed.canvas },
    effects: {
      ...defaults.effects,
      ...parsed.effects,
      outline: { ...defaults.effects.outline, ...parsed.effects?.outline },
      shadow: { ...defaults.effects.shadow, ...parsed.effects?.shadow },
    },
  });
}

export function interpolateKeyframes(keyframes = [], time = 0) {
  if (!keyframes.length) return {};
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);
  if (time <= sorted[0].time) return { ...sorted[0] };
  if (time >= sorted[sorted.length - 1].time) return { ...sorted[sorted.length - 1] };
  const rightIndex = sorted.findIndex((frame) => frame.time >= time);
  const left = sorted[rightIndex - 1];
  const right = sorted[rightIndex];
  const ratio = EASINGS[right.easing || left.easing || "linear"]((time - left.time) / Math.max(1, right.time - left.time));
  const result = { time };
  ["x", "y", "scale", "scaleX", "scaleY", "rotation", "opacity", "blur"].forEach((key) => {
    if (left[key] === undefined && right[key] === undefined) return;
    const a = left[key] ?? right[key] ?? 0;
    const b = right[key] ?? a;
    result[key] = a + (b - a) * ratio;
  });
  return result;
}

export function evaluateObjectAtTime(object, time) {
  if (!object.animation?.enabled || !object.animation.keyframes?.length) return object;
  const duration = Math.max(1, object.animation.duration || 2000);
  const frame = interpolateKeyframes(object.animation.keyframes, Math.max(0, time) % duration);
  return {
    ...object,
    x: frame.x ?? object.x,
    y: frame.y ?? object.y,
    rotation: frame.rotation ?? object.rotation,
    opacity: frame.opacity ?? object.opacity,
    scaleX: frame.scaleX ?? frame.scale ?? object.scaleX,
    scaleY: frame.scaleY ?? frame.scale ?? object.scaleY,
    blur: frame.blur ?? object.blur ?? 0,
  };
}

export function animationPreset(name, object, duration = 2000) {
  const d = Math.min(MAX_ANIMATION_DURATION, Math.max(250, duration));
  const base = { x: object.x, y: object.y, scale: 1, rotation: object.rotation || 0, opacity: 1 };
  const presets = {
    "Fade In": [{ ...base, time: 0, opacity: 0 }, { ...base, time: d }],
    "Pop In": [{ ...base, time: 0, scale: 0.2, opacity: 0 }, { ...base, time: d * 0.7, scale: 1.12 }, { ...base, time: d }],
    "Zoom In": [{ ...base, time: 0, scale: 0.1, opacity: 0 }, { ...base, time: d }],
    "Slide In": [{ ...base, time: 0, x: -100, opacity: 0 }, { ...base, time: d }],
    "Bounce In": [{ ...base, time: 0, y: object.y - 120, opacity: 0 }, { ...base, time: d * 0.7, y: object.y + 18 }, { ...base, time: d }],
    Pulse: [{ ...base, time: 0, scale: 1 }, { ...base, time: d / 2, scale: 1.12 }, { ...base, time: d, scale: 1 }],
    Bounce: [{ ...base, time: 0 }, { ...base, time: d / 2, y: object.y - 20 }, { ...base, time: d, y: object.y }],
    Float: [{ ...base, time: 0 }, { ...base, time: d / 2, y: object.y - 14 }, { ...base, time: d, y: object.y }],
    Swing: [{ ...base, time: 0, rotation: -8 }, { ...base, time: d / 2, rotation: 8 }, { ...base, time: d, rotation: -8 }],
    Shake: [{ ...base, time: 0 }, { ...base, time: d / 3, x: object.x - 10 }, { ...base, time: d * 2 / 3, x: object.x + 10 }, { ...base, time: d, x: object.x }],
    Wobble: [{ ...base, time: 0, rotation: -5 }, { ...base, time: d / 2, rotation: 5 }, { ...base, time: d, rotation: -5 }],
    Spin: [{ ...base, time: 0, rotation: object.rotation || 0 }, { ...base, time: d, rotation: (object.rotation || 0) + 360 }],
    Heartbeat: [{ ...base, time: 0, scale: 1 }, { ...base, time: d * 0.25, scale: 1.16 }, { ...base, time: d * 0.5, scale: 1 }, { ...base, time: d * 0.75, scale: 1.12 }, { ...base, time: d, scale: 1 }],
    Glow: [{ ...base, time: 0, opacity: 0.55 }, { ...base, time: d / 2, opacity: 1 }, { ...base, time: d, opacity: 0.55 }],
    "Fade Out": [{ ...base, time: 0 }, { ...base, time: d, opacity: 0 }],
    "Zoom Out": [{ ...base, time: 0 }, { ...base, time: d, scale: 0.1, opacity: 0 }],
    "Slide Out": [{ ...base, time: 0 }, { ...base, time: d, x: STICKER_CANVAS_SIZE + 100, opacity: 0 }],
    "Pop Out": [{ ...base, time: 0 }, { ...base, time: d * 0.7, scale: 1.12 }, { ...base, time: d, scale: 0.2, opacity: 0 }],
  };
  return { enabled: true, duration: d, keyframes: presets[name] || presets["Fade In"] };
}

function drawShape(ctx, object) {
  const { shape, width: w, height: h, color = "#3b5bff" } = object;
  const x = 0; const y = 0;
  const polygon = (points) => {
    points.forEach(([px, py], index) => index ? ctx.lineTo(px, py) : ctx.moveTo(px, py));
    ctx.closePath();
  };
  const regularPolygon = (sides, radiusX = Math.abs(w / 2), radiusY = Math.abs(h / 2), offset = -Math.PI / 2) =>
    polygon(Array.from({ length: sides }, (_, index) => {
      const angle = offset + (index * Math.PI * 2) / sides;
      return [x + Math.cos(angle) * radiusX, y + Math.sin(angle) * radiusY];
    }));
  ctx.beginPath();
  if (shape === "circle") ctx.ellipse(x, y, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2);
  else if (shape === "triangle") { ctx.moveTo(x, y - h / 2); ctx.lineTo(x + w / 2, y + h / 2); ctx.lineTo(x - w / 2, y + h / 2); ctx.closePath(); }
  else if (shape === "heart") { ctx.moveTo(x, y + h / 3); ctx.bezierCurveTo(x - w * .8, y - h * .15, x - w * .45, y - h * .65, x, y - h * .2); ctx.bezierCurveTo(x + w * .45, y - h * .65, x + w * .8, y - h * .15, x, y + h / 3); }
  else if (shape === "star") { for (let i = 0; i < 10; i += 1) { const angle = -Math.PI / 2 + (i * Math.PI) / 5; const radius = i % 2 ? Math.min(w, h) * .22 : Math.min(w, h) * .5; const px = x + Math.cos(angle) * radius; const py = y + Math.sin(angle) * radius; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); }
  else if (shape === "roundedRectangle") ctx.roundRect(x - w / 2, y - h / 2, w, h, Math.min(24, Math.abs(w / 4), Math.abs(h / 4)));
  else if (shape === "diamond") regularPolygon(4, Math.abs(w / 2), Math.abs(h / 2));
  else if (shape === "pentagon") regularPolygon(5);
  else if (shape === "hexagon") regularPolygon(6);
  else if (shape === "octagon") regularPolygon(8);
  else if (shape === "parallelogram") polygon([[x - w * .35, y - h / 2], [x + w / 2, y - h / 2], [x + w * .35, y + h / 2], [x - w / 2, y + h / 2]]);
  else if (shape === "trapezoid") polygon([[x - w * .3, y - h / 2], [x + w * .3, y - h / 2], [x + w / 2, y + h / 2], [x - w / 2, y + h / 2]]);
  else if (shape === "arrow") polygon([[x - w / 2, y - h * .2], [x + w * .05, y - h * .2], [x + w * .05, y - h / 2], [x + w / 2, y], [x + w * .05, y + h / 2], [x + w * .05, y + h * .2], [x - w / 2, y + h * .2]]);
  else if (shape === "chevron") polygon([[x - w / 2, y - h / 2], [x, y], [x - w / 2, y + h / 2], [x - w * .2, y + h / 2], [x + w / 2, y], [x - w * .2, y - h / 2]]);
  else if (shape === "cross") polygon([[x - w * .18, y - h / 2], [x + w * .18, y - h / 2], [x + w * .18, y - h * .18], [x + w / 2, y - h * .18], [x + w / 2, y + h * .18], [x + w * .18, y + h * .18], [x + w * .18, y + h / 2], [x - w * .18, y + h / 2], [x - w * .18, y + h * .18], [x - w / 2, y + h * .18], [x - w / 2, y - h * .18], [x - w * .18, y - h * .18]]);
  else if (shape === "plus") polygon([[x - w * .16, y - h / 2], [x + w * .16, y - h / 2], [x + w * .16, y - h * .16], [x + w / 2, y - h * .16], [x + w / 2, y + h * .16], [x + w * .16, y + h * .16], [x + w * .16, y + h / 2], [x - w * .16, y + h / 2], [x - w * .16, y + h * .16], [x - w / 2, y + h * .16], [x - w / 2, y - h * .16], [x - w * .16, y - h * .16]]);
  else if (shape === "ring") { ctx.arc(x, y, Math.min(Math.abs(w), Math.abs(h)) / 2, 0, Math.PI * 2); ctx.arc(x, y, Math.min(Math.abs(w), Math.abs(h)) / 4, 0, Math.PI * 2, true); }
  else if (shape === "cloud") { ctx.moveTo(x - w * .42, y + h * .18); ctx.bezierCurveTo(x - w * .58, y - h * .2, x - w * .3, y - h * .45, x - w * .05, y - h * .3); ctx.bezierCurveTo(x + w * .08, y - h * .62, x + w * .5, y - h * .5, x + w * .48, y - h * .12); ctx.bezierCurveTo(x + w * .7, y - h * .08, x + w * .6, y + h * .3, x + w * .35, y + h * .3); ctx.lineTo(x - w * .42, y + h * .3); ctx.closePath(); }
  else if (shape === "speechBubble") { ctx.rect(x - w / 2, y - h / 2, w, h * .72); ctx.moveTo(x - w * .2, y + h * .22); ctx.lineTo(x - w * .34, y + h / 2); ctx.lineTo(x + w * .02, y + h * .22); ctx.closePath(); }
  else if (shape === "lightning") polygon([[x + w * .08, y - h / 2], [x - w * .42, y + h * .08], [x - w * .04, y + h * .08], [x - w * .14, y + h / 2], [x + w * .43, y - h * .12], [x + w * .05, y - h * .12]]);
  else if (shape === "moon") { ctx.arc(x, y, Math.min(Math.abs(w), Math.abs(h)) / 2, 0.35, Math.PI * 1.85); ctx.arc(x + w * .2, y - h * .12, Math.min(Math.abs(w), Math.abs(h)) / 2, Math.PI * 1.85, 0.35, true); ctx.closePath(); }
  else if (shape === "sun") { ctx.arc(x, y, Math.min(Math.abs(w), Math.abs(h)) * .28, 0, Math.PI * 2); for (let i = 0; i < 8; i += 1) { const angle = i * Math.PI / 4; ctx.moveTo(x + Math.cos(angle) * Math.min(w, h) * .34, y + Math.sin(angle) * Math.min(w, h) * .34); ctx.lineTo(x + Math.cos(angle) * Math.min(w, h) * .5, y + Math.sin(angle) * Math.min(w, h) * .5); } }
  else if (shape === "burst") { for (let i = 0; i < 16; i += 1) { const angle = -Math.PI / 2 + (i * Math.PI) / 8; const radius = i % 2 ? Math.min(w, h) * .3 : Math.min(w, h) * .5; const px = x + Math.cos(angle) * radius; const py = y + Math.sin(angle) * radius; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); }
  else if (shape === "line") { ctx.moveTo(x - w / 2, y); ctx.lineTo(x + w / 2, y); }
  else if (shape === "capsule") ctx.roundRect(x - w / 2, y - h / 2, w, h, Math.abs(h / 2));
  else if (shape === "oval") ctx.ellipse(x, y, Math.abs(w / 2), Math.abs(h * .3), 0, 0, Math.PI * 2);
  else if (shape === "triangleDown") { ctx.moveTo(x - w / 2, y - h / 2); ctx.lineTo(x + w / 2, y - h / 2); ctx.lineTo(x, y + h / 2); ctx.closePath(); }
  else if (shape === "triangleLeft") { ctx.moveTo(x + w / 2, y - h / 2); ctx.lineTo(x - w / 2, y); ctx.lineTo(x + w / 2, y + h / 2); ctx.closePath(); }
  else if (shape === "triangleRight") { ctx.moveTo(x - w / 2, y - h / 2); ctx.lineTo(x + w / 2, y); ctx.lineTo(x - w / 2, y + h / 2); ctx.closePath(); }
  else if (shape === "teardrop") { ctx.moveTo(x, y - h / 2); ctx.bezierCurveTo(x - w * .35, y - h * .05, x - w * .42, y + h * .1, x - w * .42, y + h * .2); ctx.arc(x, y + h * .2, w * .42, Math.PI, 0); ctx.bezierCurveTo(x + w * .42, y + h * .1, x + w * .35, y - h * .05, x, y - h / 2); ctx.closePath(); }
  else if (shape === "shield") { ctx.moveTo(x, y - h / 2); ctx.lineTo(x + w / 2, y - h * .3); ctx.lineTo(x + w * .4, y + h * .12); ctx.bezierCurveTo(x + w * .3, y + h * .32, x + w * .12, y + h * .43, x, y + h / 2); ctx.bezierCurveTo(x - w * .12, y + h * .43, x - w * .3, y + h * .32, x - w * .4, y + h * .12); ctx.lineTo(x - w / 2, y - h * .3); ctx.closePath(); }
  else if (shape === "badge") { for (let i = 0; i < 16; i += 1) { const angle = -Math.PI / 2 + (i * Math.PI) / 8; const radius = i % 2 ? Math.min(w, h) * .38 : Math.min(w, h) * .5; const px = x + Math.cos(angle) * radius; const py = y + Math.sin(angle) * radius; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); }
  else if (shape === "tag") { polygon([[x - w / 2, y - h / 2], [x + w * .1, y - h / 2], [x + w / 2, y], [x + w * .1, y + h / 2], [x - w / 2, y + h / 2], [x - w * .25, y]]); }
  else if (shape === "flag") { ctx.moveTo(x - w * .32, y + h / 2); ctx.lineTo(x - w * .32, y - h / 2); ctx.lineTo(x + w / 2, y - h * .35); ctx.lineTo(x + w * .18, y); ctx.lineTo(x + w / 2, y + h * .35); ctx.lineTo(x - w * .32, y + h * .35); }
  else if (shape === "ribbon") { ctx.moveTo(x - w * .3, y - h / 2); ctx.lineTo(x + w * .3, y - h / 2); ctx.lineTo(x + w * .3, y + h * .05); ctx.bezierCurveTo(x + w * .3, y + h * .4, x - w * .3, y + h * .4, x - w * .3, y + h * .05); ctx.closePath(); }
  else if (shape === "semicircle") { ctx.arc(x, y + h * .12, Math.min(Math.abs(w), Math.abs(h)) / 2, Math.PI, 0); ctx.lineTo(x + w / 2, y + h * .12); ctx.closePath(); }
  else if (shape === "quarterCircle") { ctx.moveTo(x - w / 2, y + h / 2); ctx.arc(x - w / 2, y + h / 2, Math.min(Math.abs(w), Math.abs(h)), -Math.PI / 2, 0); ctx.closePath(); }
  else if (shape === "pie") { ctx.moveTo(x, y); ctx.arc(x, y, Math.min(Math.abs(w), Math.abs(h)) / 2, -Math.PI / 2, Math.PI / 2); ctx.closePath(); }
  else if (shape === "arc") { ctx.arc(x, y, Math.min(Math.abs(w), Math.abs(h)) / 2, Math.PI, 0); }
  else if (shape === "infinity") { ctx.moveTo(x - w * .4, y); ctx.bezierCurveTo(x - w * .15, y - h * .5, x + w * .05, y - h * .5, x + w * .4, y); ctx.bezierCurveTo(x + w * .05, y + h * .5, x - w * .15, y + h * .5, x - w * .4, y); ctx.moveTo(x + w * .4, y); ctx.bezierCurveTo(x + w * .15, y - h * .5, x - w * .05, y - h * .5, x - w * .4, y); ctx.bezierCurveTo(x - w * .05, y + h * .5, x + w * .15, y + h * .5, x + w * .4, y); }
  else ctx.rect(x - w / 2, y - h / 2, w, h);
  ctx.fillStyle = color; if (shape !== "line") ctx.fill(shape === "ring" || shape === "sun" ? "evenodd" : "nonzero");
  if (object.strokeWidth) { ctx.strokeStyle = object.stroke || "#ffffff"; ctx.lineWidth = object.strokeWidth; ctx.stroke(); }
  else if (["line", "arc", "infinity", "sun"].includes(shape)) { ctx.strokeStyle = color; ctx.lineWidth = Math.max(4, Math.min(Math.abs(w), Math.abs(h)) / 8); ctx.stroke(); }
}

function clipMask(ctx, object) {
  if (object.mask === "circle") { ctx.beginPath(); ctx.arc(0, 0, Math.min(object.width, object.height) / 2, 0, Math.PI * 2); ctx.clip(); }
  if (object.mask === "rounded") { const r = Math.min(24, object.width / 4, object.height / 4); ctx.beginPath(); ctx.roundRect(-object.width / 2, -object.height / 2, object.width, object.height, r); ctx.clip(); }
  if (object.mask === "heart") { ctx.beginPath(); ctx.moveTo(0, object.height * .38); ctx.bezierCurveTo(-object.width * .8, -object.height * .15, -object.width * .45, -object.height * .65, 0, -object.height * .2); ctx.bezierCurveTo(object.width * .45, -object.height * .65, object.width * .8, -object.height * .15, 0, object.height * .38); ctx.closePath(); ctx.clip(); }
  if (object.mask === "star") { ctx.beginPath(); for (let i = 0; i < 10; i += 1) { const angle = -Math.PI / 2 + (i * Math.PI) / 5; const radius = i % 2 ? Math.min(object.width, object.height) * .22 : Math.min(object.width, object.height) * .5; const px = Math.cos(angle) * radius; const py = Math.sin(angle) * radius; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); ctx.clip(); }
}

/**
 * The object's filters and blur as one canvas filter string.
 *
 * Filters live on the object rather than being baked into the bitmap, so the
 * same values drive the preview and the export - there is only one renderer.
 */
export function objectFilterString(object) {
  const filters = object.filters && typeof object.filters === "object" ? object.filters : {};
  const parts = [];
  const scale = (key, name, neutral) => {
    const value = filters[key];
    if (Number.isFinite(value) && value !== neutral) parts.push(`${name}(${Math.max(0, value)})`);
  };
  scale("brightness", "brightness", 1);
  scale("contrast", "contrast", 1);
  scale("saturation", "saturate", 1);
  scale("grayscale", "grayscale", 0);
  scale("sepia", "sepia", 0);
  const blur = (Number.isFinite(filters.blur) ? filters.blur : 0)
    + (Number.isFinite(object.blur) ? object.blur : 0);
  if (blur > 0) parts.push(`blur(${blur}px)`);
  return parts.join(" ");
}

/**
 * A crop as source-rectangle pixels, or null when it is not usable.
 *
 * Stored normalised (0-1) so the same crop survives a source image being
 * replaced by a different resolution.
 */
export function objectCropRect(crop, image) {
  if (!crop || typeof crop !== "object") return null;
  const values = ["x", "y", "width", "height"].map((key) => crop[key]);
  if (!values.every((value) => Number.isFinite(value) && value >= 0 && value <= 1)) return null;
  const [x, y, width, height] = values;
  if (width <= 0 || height <= 0) return null;
  return {
    sx: x * image.naturalWidth,
    sy: y * image.naturalHeight,
    sw: Math.max(1, width * image.naturalWidth),
    sh: Math.max(1, height * image.naturalHeight),
  };
}

function drawObject(ctx, object, imageCache, time) {
  if (!object.visible || object.opacity <= 0) return;
  if (Number.isFinite(object.startTime) && time < object.startTime) return;
  if (Number.isFinite(object.endTime) && time > object.endTime) return;
  const evaluated = evaluateObjectAtTime(object, time);
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, evaluated.opacity ?? 1));
  const blendModes = new Set(["source-over", "multiply", "screen", "overlay", "darken", "lighten"]);
  ctx.globalCompositeOperation = blendModes.has(evaluated.blendMode) ? evaluated.blendMode : "source-over";
  ctx.translate(evaluated.x, evaluated.y);
  ctx.rotate((evaluated.rotation * Math.PI) / 180);
  ctx.scale((evaluated.flipX ? -1 : 1) * (evaluated.scaleX || 1), (evaluated.flipY ? -1 : 1) * (evaluated.scaleY || 1));
  const filter = objectFilterString(evaluated);
  if (filter) ctx.filter = filter;
  if (evaluated.type === "group") {
    evaluated.children?.forEach((child) => drawObject(ctx, { ...child, x: child.x, y: child.y }, imageCache, time));
  } else if (evaluated.type === "image") {
    const image = imageCache.get(evaluated.src);
    if (image?.complete && image.naturalWidth) {
      clipMask(ctx, evaluated);
      const rect = objectCropRect(evaluated.crop, image);
      if (rect) ctx.drawImage(image, rect.sx, rect.sy, rect.sw, rect.sh, -evaluated.width / 2, -evaluated.height / 2, evaluated.width, evaluated.height);
      else ctx.drawImage(image, -evaluated.width / 2, -evaluated.height / 2, evaluated.width, evaluated.height);
    }
  } else if (evaluated.type === "text") {
    ctx.font = `${evaluated.fontStyle === "italic" ? "italic " : ""}${evaluated.fontWeight || 800} ${evaluated.fontSize || 52}px ${evaluated.fontFamily || "system-ui"}`;
    ctx.textAlign = evaluated.textAlign || "center"; ctx.textBaseline = "middle";
    // letterSpacing is ignored by browsers that do not support it, which only
    // costs tracking - never a missing glyph.
    if (Number.isFinite(evaluated.letterSpacing)) ctx.letterSpacing = `${evaluated.letterSpacing}px`;
    const fontSize = evaluated.fontSize || 52;
    const lineHeight = fontSize * (Number.isFinite(evaluated.lineHeight) && evaluated.lineHeight > 0 ? evaluated.lineHeight : 1);
    const lines = String(evaluated.text || "").split("\n");
    lines.forEach((line, index) => { const offset = (index - (lines.length - 1) / 2) * lineHeight; if (evaluated.textStrokeWidth) { ctx.strokeStyle = evaluated.textStroke || "#ffffff"; ctx.lineWidth = evaluated.textStrokeWidth; ctx.strokeText(line, 0, offset); } ctx.fillStyle = evaluated.color || "#ffffff"; ctx.fillText(line, 0, offset); });
  } else if (evaluated.type === "shape") drawShape(ctx, evaluated);
  else if (evaluated.type === "drawing") {
    clipMask(ctx, evaluated);
    drawSmoothPath(ctx, evaluated.points, evaluated, evaluated.erase ? "destination-out" : "source-over");
  }
  ctx.restore();
}

export function drawSmoothPath(ctx, points = [], style = {}, composite = "source-over") {
  if (!points.length) return;
  ctx.save();
  ctx.globalCompositeOperation = composite;
  const brushType = style.brushType || "marker";
  const brushAlpha = brushType === "pencil" ? 0.72 : 1;
  const brushScale = brushType === "pencil" ? 0.78 : brushType === "highlighter" ? 1.35 : 1;
  ctx.globalAlpha = Math.min(1, Math.max(0, (style.opacity ?? 1) * brushAlpha));
  ctx.strokeStyle = style.color || "#3b5bff";
  ctx.lineWidth = Math.max(1, (style.size || 8) * brushScale);
  ctx.lineCap = style.lineCap || "round";
  ctx.lineJoin = style.lineJoin || "round";
  if (brushType === "highlighter" && composite !== "destination-out") ctx.globalCompositeOperation = "multiply";
  if (points.length === 1) {
    ctx.beginPath();
    ctx.arc(points[0][0], points[0][1], Math.max(0.5, ctx.lineWidth / 2), 0, Math.PI * 2);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let index = 1; index < points.length - 1; index += 1) {
      const current = points[index];
      const next = points[index + 1];
      ctx.quadraticCurveTo(current[0], current[1], (current[0] + next[0]) / 2, (current[1] + next[1]) / 2);
    }
    const previous = points[points.length - 2];
    const last = points[points.length - 1];
    ctx.quadraticCurveTo(previous[0], previous[1], last[0], last[1]);
    ctx.stroke();
  }
  ctx.restore();
}

function renderContent(ctx, project, time, imageCache) {
  ctx.clearRect(0, 0, project.canvas.width, project.canvas.height);
  const drawingLayer = document.createElement("canvas");
  drawingLayer.width = project.canvas.width; drawingLayer.height = project.canvas.height;
  const drawingContext = drawingLayer.getContext("2d");
  const flushDrawings = () => {
    ctx.drawImage(drawingLayer, 0, 0);
    drawingContext.clearRect(0, 0, project.canvas.width, project.canvas.height);
  };
  project.objects.forEach((object) => {
    if (object.type === "drawing") {
      if (object.erase) {
        const evaluated = evaluateObjectAtTime(object, time);
        if (evaluated.visible && evaluated.opacity > 0 && (!Number.isFinite(evaluated.startTime) || time >= evaluated.startTime) && (!Number.isFinite(evaluated.endTime) || time <= evaluated.endTime)) {
          drawingContext.save();
          drawingContext.translate(evaluated.x, evaluated.y);
          drawingContext.rotate((evaluated.rotation * Math.PI) / 180);
          drawingContext.scale((evaluated.flipX ? -1 : 1) * (evaluated.scaleX || 1), (evaluated.flipY ? -1 : 1) * (evaluated.scaleY || 1));
          drawSmoothPath(drawingContext, evaluated.points, evaluated, "destination-out");
          drawingContext.restore();
        }
      } else {
        const evaluated = evaluateObjectAtTime(object, time);
        if (evaluated.visible && evaluated.opacity > 0) {
          drawingContext.save();
          drawingContext.translate(evaluated.x, evaluated.y);
          drawingContext.rotate((evaluated.rotation * Math.PI) / 180);
          drawingContext.scale((evaluated.flipX ? -1 : 1) * (evaluated.scaleX || 1), (evaluated.flipY ? -1 : 1) * (evaluated.scaleY || 1));
          drawSmoothPath(drawingContext, evaluated.points, evaluated, "source-over");
          drawingContext.restore();
        }
      }
      return;
    }
    flushDrawings();
    drawObject(ctx, object, imageCache, time);
  });
  flushDrawings();
}

export function renderCompositionAtTime(ctx, project, time = 0, options = {}) {
  const width = project.canvas.width; const height = project.canvas.height;
  ctx.clearRect(0, 0, width, height);
  if (options.checkerboard) { for (let y = 0; y < height; y += 32) for (let x = 0; x < width; x += 32) { ctx.fillStyle = ((x / 32 + y / 32) % 2) ? "#eef1f6" : "#ffffff"; ctx.fillRect(x, y, 32, 32); } }
  const content = options.contentCanvas || document.createElement("canvas"); content.width = width; content.height = height;
  const contentCtx = content.getContext("2d"); renderContent(contentCtx, project, time, options.imageCache || new Map());
  if (options.draftDrawing) {
    drawSmoothPath(contentCtx, options.draftDrawing.points, options.draftDrawing, options.draftDrawing.erase ? "destination-out" : "source-over");
  }
  const outline = project.effects?.outline;
  if (outline?.enabled && outline.width > 0) {
    const mask = document.createElement("canvas"); mask.width = width; mask.height = height; const maskCtx = mask.getContext("2d");
    maskCtx.drawImage(content, 0, 0); maskCtx.globalCompositeOperation = "source-in"; maskCtx.fillStyle = outline.color; maskCtx.fillRect(0, 0, width, height);
    if (project.effects?.shadow?.enabled) { ctx.save(); const s = project.effects.shadow; ctx.globalAlpha = s.opacity; ctx.shadowColor = s.color; ctx.shadowBlur = s.blur; ctx.shadowOffsetX = s.offsetX; ctx.shadowOffsetY = s.offsetY; ctx.drawImage(mask, 0, 0); ctx.restore(); }
    const radius = Math.min(24, Math.max(1, Math.round(outline.width))); for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) ctx.drawImage(mask, Math.cos(angle) * radius, Math.sin(angle) * radius);
  } else if (project.effects?.shadow?.enabled) { ctx.save(); const s = project.effects.shadow; ctx.globalAlpha = s.opacity; ctx.shadowColor = s.color; ctx.shadowBlur = s.blur; ctx.shadowOffsetX = s.offsetX; ctx.shadowOffsetY = s.offsetY; ctx.drawImage(content, 0, 0); ctx.restore(); }
  ctx.drawImage(content, 0, 0);
  if (options.selectedIds?.length) options.selectedIds.forEach((id) => { const object = project.objects.find((item) => item.id === id); if (!object) return; const handles = selectionHandlePositions(object); ctx.save(); ctx.translate(object.x, object.y); ctx.rotate((object.rotation * Math.PI) / 180); ctx.strokeStyle = "#3b5bff"; ctx.setLineDash([6, 4]); ctx.strokeRect(-object.width / 2 - 8, -object.height / 2 - 8, object.width + 16, object.height + 16); ctx.setLineDash([]); ctx.fillStyle = "#3b5bff"; ctx.beginPath(); ctx.arc(handles.resize.x, handles.resize.y, handles.resize.radius, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(handles.rotate.x, handles.rotate.y, handles.rotate.radius, 0, Math.PI * 2); ctx.fill(); ctx.restore(); });
}

export function createPngBlob(canvas) {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PNG export failed")), "image/png"));
}

export async function renderSelectionToPng(project, selectedIds, imageCache = new Map(), time = 0) {
  const selected = project.objects.filter((object) => selectedIds.includes(object.id));
  if (!selected.length) throw new Error("Select at least two objects to create a composite sticker");
  const bounds = selected.reduce((result, object) => ({
    left: Math.min(result.left, object.x - (object.width * Math.abs(object.scaleX || 1)) / 2),
    top: Math.min(result.top, object.y - (object.height * Math.abs(object.scaleY || 1)) / 2),
    right: Math.max(result.right, object.x + (object.width * Math.abs(object.scaleX || 1)) / 2),
    bottom: Math.max(result.bottom, object.y + (object.height * Math.abs(object.scaleY || 1)) / 2),
  }), { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity });
  const padding = 32;
  const left = Math.max(0, Math.floor(bounds.left - padding));
  const top = Math.max(0, Math.floor(bounds.top - padding));
  const right = Math.min(project.canvas.width, Math.ceil(bounds.right + padding));
  const bottom = Math.min(project.canvas.height, Math.ceil(bounds.bottom + padding));
  const width = Math.max(1, right - left);
  const height = Math.max(1, bottom - top);
  const full = document.createElement("canvas");
  full.width = project.canvas.width;
  full.height = project.canvas.height;
  renderCompositionAtTime(full.getContext("2d"), {
    ...project,
    objects: selected,
  }, time, { imageCache });
  const cropped = document.createElement("canvas");
  cropped.width = width;
  cropped.height = height;
  cropped.getContext("2d").drawImage(full, left, top, width, height, 0, 0, width, height);
  return { blob: await createPngBlob(cropped), x: left + width / 2, y: top + height / 2, width, height };
}

export async function validatePngBlob(blob, expectedWidth = STICKER_CANVAS_SIZE, expectedHeight = STICKER_CANVAS_SIZE, { requireTransparency = false } = {}) {
  if (!(blob instanceof Blob) || blob.type !== "image/png" || blob.size <= 0) throw new Error("Generated sticker is not a valid PNG");
  if (typeof createImageBitmap !== "function") return { valid: true, verified: false, hasPixels: true, hasTransparency: null };
  const bitmap = await createImageBitmap(blob);
  try {
    if (bitmap.width !== expectedWidth || bitmap.height !== expectedHeight) throw new Error(`Sticker must be ${expectedWidth}×${expectedHeight}px`);
    const canvas = document.createElement("canvas"); canvas.width = bitmap.width; canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true }); ctx.drawImage(bitmap, 0, 0);
    const pixels = ctx.getImageData(0, 0, bitmap.width, bitmap.height).data;
    let hasPixels = false; let hasTransparency = false;
    for (let i = 3; i < pixels.length; i += 4) { if (pixels[i] > 0) hasPixels = true; if (pixels[i] < 255) hasTransparency = true; if (hasPixels && hasTransparency) break; }
    if (!hasPixels) throw new Error("Generated sticker contains no visible pixels");
    if (requireTransparency && !hasTransparency) throw new Error("Generated sticker lost transparency");
    return { valid: true, verified: true, width: bitmap.width, height: bitmap.height, hasPixels, hasTransparency };
  } finally { bitmap.close?.(); }
}

/**
 * A point expressed in one object's own rotated frame.
 *
 * Everything an object draws happens after `translate(x, y)` and
 * `rotate(rotation)`, so geometry compared in canvas space is wrong for any
 * rotated layer.
 */
export function toObjectSpace(point, object) {
  const dx = point.x - object.x;
  const dy = point.y - object.y;
  const radians = (-(object.rotation || 0) * Math.PI) / 180;
  return {
    x: dx * Math.cos(radians) - dy * Math.sin(radians),
    y: dx * Math.sin(radians) + dy * Math.cos(radians),
  };
}

/**
 * Where the selection overlay's handles sit, in the object's own frame.
 *
 * The renderer draws from this and the editor hit-tests against it, so a handle
 * can never be painted somewhere the pointer cannot grab it.
 */
export function selectionHandlePositions(object) {
  return {
    resize: { x: object.width / 2 + 2, y: object.height / 2 + 2, radius: 6 },
    rotate: { x: 0, y: -object.height / 2 - 14, radius: 5 },
  };
}

/**
 * Which selection handle a point grabs, or null for none.
 *
 * Resize is tested first so an overlap on a very short object still resizes,
 * which is the gesture users reach for far more often.
 */
export function hitTestHandle(point, object, tolerance = 12) {
  const local = toObjectSpace(point, object);
  const handles = selectionHandlePositions(object);
  return (
    ["resize", "rotate"].find(
      (name) => Math.hypot(local.x - handles[name].x, local.y - handles[name].y) <= tolerance,
    ) || null
  );
}

export function hitTestObject(point, object, padding = 10) {
  const dx = point.x - object.x; const dy = point.y - object.y;
  const radians = -(object.rotation || 0) * Math.PI / 180;  const rotatedX = dx * Math.cos(radians) - dy * Math.sin(radians);
  const rotatedY = dx * Math.sin(radians) + dy * Math.cos(radians);
  const localX = rotatedX / Math.max(0.001, Math.abs(object.scaleX || 1));
  const localY = rotatedY / Math.max(0.001, Math.abs(object.scaleY || 1));
  if (object.type === "drawing" && Array.isArray(object.points) && object.points.length > 1) {
    const distanceToSegment = (p, a, b) => {
      const vx = b[0] - a[0]; const vy = b[1] - a[1];
      const length = vx * vx + vy * vy;
      const ratio = length ? Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / length)) : 0;
      return Math.hypot(p[0] - (a[0] + ratio * vx), p[1] - (a[1] + ratio * vy));
    };
    const localPoint = [localX, localY];
    for (let index = 1; index < object.points.length; index += 1) {
      if (distanceToSegment(localPoint, object.points[index - 1], object.points[index]) <= (object.size || 8) / 2 + padding) return true;
    }
    return false;
  }
  return Math.abs(localX) <= object.width / 2 + padding && Math.abs(localY) <= object.height / 2 + padding;
}

export function projectAtTime(project, time) {
  return { ...project, objects: project.objects.map((object) => evaluateObjectAtTime(object, time)) };
}
