import assert from "node:assert/strict";
import {
  animationPreset,
  createStudioObject,
  createStudioProject,
  createDrawingObjectFromPoints,
  deserializeStickerProject,
  hitTestObject,
  interpolateKeyframes,
  serializeStickerProject,
} from "../src/components/Stories/stickerStudioEngine.js";

const project = createStudioProject();
const image = createStudioObject("image", { x: 100, y: 100, width: 120, height: 80, rotation: 45 });
const drawing = createDrawingObjectFromPoints([[40, 40], [80, 80], [120, 60]], { color: "#ef4444", size: 12 });
project.objects.push(image, createStudioObject("text", { text: "hello" }), drawing);
assert.equal(project.canvas.width, 512);
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
console.log("Sticker Studio engine smoke tests passed");
