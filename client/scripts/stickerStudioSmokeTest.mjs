import assert from "node:assert/strict";
import { createRequire } from "node:module";
import {
  animationPreset,
  BRUSH_PRESETS,
  createStudioObject,
  createStudioProject,
  createDrawingObjectFromPoints,
  deserializeStickerProject,
  drawSmoothPath,
  hitTestHandle,
  hitTestObject,
  interpolateKeyframes,
  objectCropRect,
  objectFilterString,
  selectionHandlePositions,
  serializeStickerProject,
  STICKER_CANVAS_SIZE,
  STICKER_GRID_STEP,
  toObjectSpace,
} from "../src/components/Stories/stickerStudioEngine.js";
import {
  countUnavailableLayers,
  fromServerEditorState,
  toServerEditorState,
} from "../src/components/Stories/stickerSaveService.js";

// The server's own validator, when the API tree is installed: it is the contract
// the serializer below has to satisfy, so checking against it beats restating it.
let validateEditorState = null;
try {
  ({ validateEditorState } = createRequire(import.meta.url)("../../server/utils/stickerValidators.js"));
} catch {
  console.log("Server validators unavailable - editor state contract check skipped");
}


const project = createStudioProject();
const image = createStudioObject("image", { x: 100, y: 100, width: 120, height: 80, rotation: 45 });
const drawing = createDrawingObjectFromPoints([[40, 40], [80, 80], [120, 60]], { color: "#ef4444", size: 12 });
project.objects.push(image, createStudioObject("text", { text: "hello" }), drawing);
assert.equal(project.canvas.width, 512);
// The workspace paints the grid as a share of the canvas box and a drag snaps to
// the same step, so the step has to be a whole number of canvas units that
// divides the canvas evenly - otherwise the visible grid and the snap disagree.
assert.equal(Number.isInteger(STICKER_GRID_STEP), true);
assert.equal(STICKER_CANVAS_SIZE % STICKER_GRID_STEP, 0);
assert.equal(deserializeStickerProject(serializeStickerProject(project)).objects.length, 3);
assert.equal(hitTestObject({ x: 100, y: 100 }, image), true);
assert.equal(hitTestObject({ x: drawing.x, y: drawing.y }, drawing), true);
const migrated = deserializeStickerProject({ version: 1, objects: [], paths: [{ id: "legacy", points: [[20, 20], [40, 40]], color: "#000", size: 8 }] });
assert.equal(migrated.objects[0].type, "drawing");
assert.equal("paths" in migrated, false);
assert.equal(Math.round(interpolateKeyframes([{ time: 0, x: 0 }, { time: 100, x: 100 }], 50).x), 50);
assert.equal(animationPreset("Fade In", image, 1000).keyframes.length, 2);
assert.throws(
  () => deserializeStickerProject({ v: "5.5.9", fr: 60, ip: 0, op: 300, w: 1080, h: 1080, layers: [] }),
  /Lottie animation JSON/,
);

// The drawing toolbar offers a pen style, a size, a colour and an opacity. Each
// has to reach the canvas, or the control is decoration: `drawSmoothPath` is the
// only place that turns those four values into strokes, so recording what it
// sets on the context is what proves the controls do something.
function recordStroke(style, composite, points = [[0, 0], [10, 10], [20, 0]]) {
  const calls = [];
  const state = {};
  const context = new Proxy(state, {
    // A property that was assigned reads back as itself - the renderer derives a
    // dot's radius from ctx.lineWidth, so the stub has to behave like a context
    // and not only record. Anything never assigned is a method call.
    get: (target, key) => {
      if (key in target) return target[key];
      return (...args) => {
        calls.push([key, args]);
        return undefined;
      };
    },
    set: (target, key, value) => {
      target[key] = value;
      return true;
    },
  });
  drawSmoothPath(context, points, style, composite);
  return { ...state, calls };
}

// The three styles the toolbar shows are the three the renderer knows about, and
// each one has to behave differently: a picker whose options render identically
// is a picker that does nothing.
assert.deepEqual(BRUSH_PRESETS.map((preset) => preset.id), ["pencil", "marker", "highlighter"]);
BRUSH_PRESETS.forEach((preset) => {
  assert.ok(preset.size >= 1 && preset.size <= 128, `${preset.id} has an unusable default size`);
  assert.ok(preset.opacity > 0 && preset.opacity <= 1, `${preset.id} would start invisible`);
});
const styled = Object.fromEntries(
  BRUSH_PRESETS.map((preset) => [
    preset.id,
    recordStroke({ brushType: preset.id, color: "#ef4444", size: 20, opacity: preset.opacity }),
  ]),
);
// Pencil: lighter and thinner than its nominal size. Marker: full weight.
// Highlighter: wider, translucent and multiplied so overlaps darken.
assert.equal(styled.pencil.lineWidth, 20 * 0.78);
assert.equal(styled.marker.lineWidth, 20);
assert.equal(styled.highlighter.lineWidth, 20 * 1.35);
assert.ok(styled.pencil.globalAlpha < styled.marker.globalAlpha);
assert.equal(styled.marker.globalCompositeOperation, "source-over");
assert.equal(styled.highlighter.globalCompositeOperation, "multiply");
assert.ok(styled.highlighter.globalAlpha < 1);
// Size, colour and opacity are read straight from the style, so the sliders and
// swatches are wired to the stroke and not only to the preview.
assert.equal(recordStroke({ brushType: "marker", size: 4 }).lineWidth, 4);
assert.equal(recordStroke({ brushType: "marker", size: 48 }).lineWidth, 48);
assert.equal(recordStroke({ color: "#22c55e" }).strokeStyle, "#22c55e");
assert.equal(recordStroke({ opacity: 0.05 }).globalAlpha, 0.05);
assert.equal(recordStroke({ opacity: 1 }).globalAlpha, 1);
// The eraser is the same renderer in destination-out, so eraser opacity is a
// real partial erase - and a highlighter stroke must not switch it to multiply.
const erased = recordStroke({ brushType: "eraser", size: 26, opacity: 0.5 }, "destination-out");
assert.equal(erased.globalCompositeOperation, "destination-out");
assert.equal(erased.globalAlpha, 0.5);
assert.equal(erased.lineWidth, 26);
assert.equal(
  recordStroke({ brushType: "highlighter" }, "destination-out").globalCompositeOperation,
  "destination-out",
);
// A tap without a drag still marks the canvas: the pen has to work on a click,
// not only on a stroke, so a dot is filled at the brush's own width.
const dot = recordStroke({ size: 10, brushType: "marker" }, "source-over", [[5, 5]]);
assert.ok(dot.calls.some(([name]) => name === "fill"));
assert.deepEqual(
  dot.calls.find(([name]) => name === "arc")?.[1].slice(0, 3),
  [5, 5, 5],
);
assert.ok(recordStroke({ size: 10 }).calls.some(([name]) => name === "stroke"));

// Crop and colour adjustment are drawn, not decorative: these are the exact
// values the one shared renderer hands the canvas for preview and export alike.
assert.equal(objectFilterString({}), "");
assert.equal(objectFilterString({ blur: 4 }), "blur(4px)");
assert.equal(
  objectFilterString({ filters: { brightness: 1, contrast: 1, saturation: 1, grayscale: 0, sepia: 0 } }),
  "",
);
assert.equal(
  objectFilterString({
    filters: { brightness: 1.2, contrast: 0.9, saturation: 1.4, grayscale: 1, sepia: 0.5, blur: 2 },
    blur: 3,
  }),
  "brightness(1.2) contrast(0.9) saturate(1.4) grayscale(1) sepia(0.5) blur(5px)",
);
const source = { naturalWidth: 400, naturalHeight: 200 };
assert.deepEqual(
  objectCropRect({ x: 0.25, y: 0, width: 0.5, height: 1 }, source),
  { sx: 100, sy: 0, sw: 200, sh: 200 },
);
[null, { x: 0, y: 0, width: 0, height: 1 }, { x: 0, y: 0, width: 2, height: 1 }, { x: "0", y: 0, width: 1, height: 1 }]
  .forEach((crop) => assert.equal(objectCropRect(crop, source), null, "an unusable crop must not reach drawImage"));

// The selection handles are drawn in the object's rotated frame, so they have to
// be hit-tested there too: a rotated layer whose handles cannot be grabbed can
// be neither resized nor rotated again.
const toCanvasSpace = (local, object) => {
  const radians = ((object.rotation || 0) * Math.PI) / 180;
  return {
    x: object.x + local.x * Math.cos(radians) - local.y * Math.sin(radians),
    y: object.y + local.x * Math.sin(radians) + local.y * Math.cos(radians),
  };
};
const handles = selectionHandlePositions(image);
assert.deepEqual(handles.resize, { x: image.width / 2 + 2, y: image.height / 2 + 2, radius: 6 });
assert.deepEqual(handles.rotate, { x: 0, y: -image.height / 2 - 14, radius: 5 });
// toObjectSpace and the canvas-space inverse above must agree, or every handle
// lands somewhere else than it is painted.
const roundTrip = toObjectSpace(toCanvasSpace(handles.resize, image), image);
assert.ok(Math.hypot(roundTrip.x - handles.resize.x, roundTrip.y - handles.resize.y) < 1e-9);
assert.equal(hitTestHandle(toCanvasSpace(handles.resize, image), image, 12), "resize");
assert.equal(hitTestHandle(toCanvasSpace(handles.rotate, image), image, 12), "rotate");
assert.equal(hitTestHandle({ x: image.x, y: image.y }, image, 12), null);
// The old canvas-space test looked here, which on a rotated layer is empty space.
assert.equal(
  hitTestHandle({ x: image.x + image.width / 2, y: image.y + image.height / 2 }, image, 12),
  null,
);
const upright = createStudioObject("shape", { x: 200, y: 200, width: 100, height: 60, rotation: 0 });
assert.equal(hitTestHandle({ x: 252, y: 232 }, upright, 12), "resize");
assert.equal(hitTestHandle({ x: 200, y: 156 }, upright, 12), "rotate");
assert.equal(hitTestHandle({ x: 200, y: 200 }, upright, 12), null);
// A tolerance that grows with zoom-out must not start matching the whole layer.
assert.equal(hitTestHandle({ x: 200, y: 200 }, upright, 40), null);

// A project holding every value the server refuses: out-of-range numbers,
// unknown keys, blob: sources, bad enums, a duplicate id and an unusable id.
const hostile = {
  version: 1,
  name: "x".repeat(200),
  canvas: { width: 4096, height: 8, background: "white" },
  duration: 999999,
  fps: 240,
  effects: { outline: { enabled: true, color: "notacolor", width: 500 } },
  objects: [
    {
      id: "img-1", type: "image", x: 1e9, y: -1e9, width: 100, height: 100,
      opacity: 5, rotation: 1e9, src: "blob:http://localhost/abc", file: {},
      originalSrc: "blob:http://localhost/abc", backgroundRemoved: true,
      attribution: "Photo by Someone", source: "pexels", sourceType: "upload",
      blendMode: "hue", mask: "triangle",
    },
    { id: "img-2", type: "image", x: 0, y: 0, width: 10, height: 10, src: "https://res.cloudinary.com/demo/a.png" },
    { id: "img-3", type: "image", x: 0, y: 0, width: 10, height: 10, src: "blob:http://localhost/xyz" },
    { id: "txt-1", type: "text", x: 0, y: 0, width: 10, height: 10, color: "white", fontWeight: 5000 },
    { id: "draw-1", type: "drawing", x: 0, y: 0, width: 10, height: 10, points: [[1, 2], ["a", 3], [4]] },
    { id: "img-1", type: "image", x: 0, y: 0, width: 1, height: 1 },
    {
      id: "grp-1", type: "group", x: 0, y: 0, width: 10, height: 10,
      children: [
        { id: "nested-grp", type: "group", x: 0, y: 0, width: 1, height: 1, children: [] },
        { id: "child-1", type: "image", x: 0, y: 0, width: 5, height: 5, src: "javascript:alert(1)" },
      ],
    },
    { id: "bad id!", type: "image", x: 0, y: 0, width: 1, height: 1 },
  ],
};
const state = toServerEditorState(hostile, { uploadedIds: new Set(["img-3"]) });
const byId = (id) => state.objects.find((object) => object.id === id);

assert.equal(state.version, 1);
assert.equal(state.name.length, 120);
assert.deepEqual(state.canvas, { width: 2048, height: 16, background: "transparent" });
assert.equal(state.duration, 60000);
assert.equal(state.fps, 60);
assert.equal(state.effects.outline.color, "#ffffff");
assert.equal(state.effects.outline.width, 64);
assert.equal(state.effects.shadow.enabled, false);

// Duplicate ids and ids the server cannot store are dropped, not repaired.
assert.deepEqual(state.objects.map((object) => object.id), ["img-1", "img-2", "img-3", "txt-1", "draw-1", "grp-1"]);

// Client-only keys never reach the wire, and a blob: layer is flagged instead.
["file", "originalSrc", "backgroundRemoved", "attribution", "source", "src"].forEach((key) => {
  assert.equal(key in byId("img-1"), false, `${key} must not be sent to the server`);
});
assert.equal(byId("img-1").assetUnavailable, true);
assert.equal(byId("img-1").opacity, 1);
assert.equal(byId("img-1").rotation, 36000);
assert.equal(byId("img-1").x, 20000);
assert.equal(byId("img-1").y, -20000);
assert.equal("blendMode" in byId("img-1"), false);
assert.equal("mask" in byId("img-1"), false);

// A layer whose bytes travel with the save carries no url: the server writes it.
assert.equal(byId("img-2").src, "https://res.cloudinary.com/demo/a.png");
assert.equal("src" in byId("img-3"), false);
assert.equal("assetUnavailable" in byId("img-3"), false);

assert.equal(byId("txt-1").text, "");
assert.equal("color" in byId("txt-1"), false);
assert.equal(byId("txt-1").fontWeight, 900);
assert.deepEqual(byId("draw-1").points, [[1, 2]]);

assert.equal(byId("grp-1").children.length, 1);
assert.equal(byId("grp-1").children[0].id, "child-1");
assert.equal("src" in byId("grp-1").children[0], false);
assert.equal(byId("grp-1").children[0].assetUnavailable, true);

// Reopening a saved sticker: the stored state has to come back as a live studio
// project with the same objects, and saving it again must stay valid. Anything
// less means a sticker can be saved but never edited.
const reopened = fromServerEditorState(state);
assert.deepEqual(
  reopened.objects.map((object) => object.id),
  state.objects.map((object) => object.id),
);
assert.equal(reopened.canvas.width, 2048);
assert.equal(reopened.duration, 60000);
assert.equal(reopened.effects.outline.width, 64);
// Every hydrated object carries the studio defaults an older save can lack.
assert.equal(reopened.objects.every((object) => typeof object.visible === "boolean"), true);
assert.equal(reopened.objects.every((object) => object.animation !== undefined), true);
assert.equal(reopened.objects.find((object) => object.id === "grp-1").children[0].id, "child-1");
// img-1 and child-1 lost untrusted URLs, img-3's bytes travelled separately.
assert.equal(countUnavailableLayers(reopened), 3);
assert.equal(countUnavailableLayers(createStudioProject()), 0);
const resaved = toServerEditorState(reopened);
assert.deepEqual(resaved.objects.map((object) => object.id), state.objects.map((object) => object.id));
// A record with no stored project still yields an empty, usable project.
assert.deepEqual(fromServerEditorState(null).objects, []);

// Crop, colour adjustment and typography have to survive the round trip, or the
// canvas would show one thing and a reopened sticker another.
const adjusted = {
  version: 1,
  objects: [
    {
      id: "img-c", type: "image", x: 10, y: 10, width: 200, height: 100, src: "/uploads/a.png",
      crop: { x: 0.1, y: 0.2, width: 0.5, height: 0.6 },
      filters: { brightness: 1.2, contrast: 9, saturation: -4, blur: 999, grayscale: 0.4, sepia: 2 },
    },
    {
      id: "img-bad", type: "image", x: 0, y: 0, width: 10, height: 10, src: "/uploads/b.png",
      crop: { x: 0.1, y: 0.1, width: 0, height: 0.5 }, filters: { brightness: "bright" },
    },
    {
      id: "txt-c", type: "text", x: 0, y: 0, width: 10, height: 10, text: "hi",
      fontFamily: "Inter, system-ui, sans-serif", fontSize: 64, fontStyle: "italic",
      textAlign: "left", lineHeight: 9, letterSpacing: -900,
      crop: { x: 0, y: 0, width: 0.5, height: 0.5 },
    },
  ],
};
const adjustedState = toServerEditorState(adjusted);
const pick = (id) => adjustedState.objects.find((object) => object.id === id);
assert.deepEqual(pick("img-c").crop, { x: 0.1, y: 0.2, width: 0.5, height: 0.6 });
assert.deepEqual(pick("img-c").filters, { brightness: 1.2, contrast: 3, saturation: 0, blur: 40, grayscale: 0.4, sepia: 1 });
// An impossible crop is dropped rather than guessed at, and so is a filter set
// with nothing usable left in it.
assert.equal("crop" in pick("img-bad"), false);
assert.equal("filters" in pick("img-bad"), false);
// Crop and filters belong to image layers only, since that is what the editor
// offers and what the renderer applies a source rectangle to.
assert.equal("crop" in pick("txt-c"), false);
assert.equal(pick("txt-c").lineHeight, 4);
assert.equal(pick("txt-c").letterSpacing, -40);
assert.equal(pick("txt-c").fontStyle, "italic");
assert.equal(pick("txt-c").textAlign, "left");
assert.equal(pick("txt-c").fontFamily, "Inter, system-ui, sans-serif");

const rehydrated = fromServerEditorState(adjustedState);
const back = (id) => rehydrated.objects.find((object) => object.id === id);
assert.deepEqual(back("img-c").crop, { x: 0.1, y: 0.2, width: 0.5, height: 0.6 });
assert.equal(back("txt-c").lineHeight, 4);
assert.equal(
  objectFilterString(back("img-c")),
  "brightness(1.2) contrast(3) saturate(0) grayscale(0.4) sepia(1) blur(40px)",
);
assert.deepEqual(objectCropRect(back("img-c").crop, source), { sx: 40, sy: 40, sw: 200, sh: 120 });

if (validateEditorState) {
  const validated = validateEditorState(state);
  assert.equal(validated.ok, true, `server rejected the serialized project: ${validated.error}`);
  const round = validateEditorState(resaved);
  assert.equal(round.ok, true, `server rejected a reopened-and-resaved project: ${round.error}`);
  const empty = validateEditorState(toServerEditorState(createStudioProject()));
  assert.equal(empty.ok, true, `server rejected an empty project: ${empty.error}`);
  const live = validateEditorState(toServerEditorState({ ...project, objects: [image, drawing] }));
  assert.equal(live.ok, true, `server rejected a live studio project: ${live.error}`);
  const adjustedCheck = validateEditorState(adjustedState);
  assert.equal(adjustedCheck.ok, true, `server rejected crop/filter/typography state: ${adjustedCheck.error}`);
  const reAdjusted = validateEditorState(toServerEditorState(rehydrated));
  assert.equal(reAdjusted.ok, true, `server rejected a reopened adjusted project: ${reAdjusted.error}`);
}

console.log("Sticker Studio engine smoke tests passed");
