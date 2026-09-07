import { useState } from "react";
import { createPortal } from "react-dom";
import Picker from "@emoji-mart/react";
import emojiData from "@emoji-mart/data";
import {
  IoAddOutline,
  IoArrowBack,
  IoArrowDown,
  IoArrowForward,
  IoArrowUp,
  IoBrushOutline,
  IoCloudUploadOutline,
  IoColorFilterOutline,
  IoCropOutline,
  IoEyeOffOutline,
  IoEyeOutline,
  IoHappyOutline,
  IoImageOutline,
  IoLockClosedOutline,
  IoLockOpenOutline,
  IoOptionsOutline,
  IoScanOutline,
  IoShapesOutline,
  IoSparklesOutline,
  IoTextOutline,
} from "react-icons/io5";
import {
  STICKER_CATEGORIES,
  getFallbackStickers,
  getStickerPreview,
} from "../MessageInput/MessageInput";
import StickerLibrary from "../Stickers/StickerLibrary";
import DrawingToolbar from "./DrawingToolbar";
import { MAX_ANIMATION_DURATION } from "./stickerStudioEngine";

const SHAPES = [
  "circle",
  "rectangle",
  "roundedRectangle",
  "triangle",
  "heart",
  "star",
  "diamond",
  "pentagon",
  "hexagon",
  "octagon",
  "parallelogram",
  "trapezoid",
  "arrow",
  "chevron",
  "cross",
  "plus",
  "ring",
  "cloud",
  "speechBubble",
  "lightning",
  "moon",
  "sun",
  "burst",
  "line",
  "capsule",
  "oval",
  "triangleDown",
  "triangleLeft",
  "triangleRight",
  "teardrop",
  "shield",
  "badge",
  "tag",
  "flag",
  "ribbon",
  "semicircle",
  "quarterCircle",
  "pie",
  "arc",
  "infinity",
];
const SHAPE_LABELS = {
  roundedRectangle: "Rounded rectangle",
  speechBubble: "Speech bubble",
};

function shapeLabel(shape) {
  return (
    SHAPE_LABELS[shape] ||
    shape
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (value) => value.toUpperCase())
  );
}

function ShapeIcon({ shape }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinejoin: "round",
    strokeLinecap: "round",
  };
  const polygon = (points) => <polygon points={points} {...common} />;
  const paths = {
    circle: <circle cx="12" cy="12" r="7" {...common} />,
    rectangle: <rect x="5" y="5" width="14" height="14" {...common} />,
    roundedRectangle: (
      <rect x="5" y="5" width="14" height="14" rx="3" {...common} />
    ),
    triangle: polygon("12,4 20,19 4,19"),
    heart: (
      <path
        d="M12 20 4.8 12.7A4.2 4.2 0 0 1 10.7 6L12 7.4 13.3 6a4.2 4.2 0 0 1 5.9 6.7Z"
        {...common}
      />
    ),
    star: (
      <path
        d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z"
        {...common}
      />
    ),
    diamond: polygon("12,3 21,12 12,21 3,12"),
    pentagon: polygon("12,3 20,9 17,19 7,19 4,9"),
    hexagon: polygon("7,4 17,4 21,12 17,20 7,20 3,12"),
    octagon: polygon("8,3 16,3 21,8 21,16 16,21 8,21 3,16 3,8"),
    parallelogram: polygon("7,5 21,5 17,19 3,19"),
    trapezoid: polygon("7,5 17,5 21,19 3,19"),
    arrow: polygon("3,9 13,9 13,4 21,12 13,20 13,15 3,15"),
    chevron: <path d="m5 4 8 8-8 8m6-16 8 8-8 8" {...common} />,
    cross: <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z" {...common} />,
    plus: <path d="M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6Z" {...common} />,
    ring: (
      <>
        <circle cx="12" cy="12" r="8" {...common} />
        <circle cx="12" cy="12" r="4" {...common} />
      </>
    ),
    cloud: (
      <path
        d="M6.5 18.5h10.8a4.2 4.2 0 0 0 .4-8.4A6.2 6.2 0 0 0 6 8.2a5.2 5.2 0 0 0 .5 10.3Z"
        {...common}
      />
    ),
    speechBubble: <path d="M4 5h16v11H9l-5 4Z" {...common} />,
    lightning: <path d="m13 2-8 11h6l-1 9 8-12h-6Z" {...common} />,
    moon: (
      <path d="M19 15a7.5 7.5 0 0 1-9.9-9.9A8.5 8.5 0 1 0 19 15Z" {...common} />
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="4" {...common} />
        <path
          d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9 7 7m10 10 2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"
          {...common}
        />
      </>
    ),
    burst: (
      <path
        d="m12 2 2 5 5-2-2 5 5 2-5 2 2 5-5-2-2 5-2-5-5 2 2-5-5-2 5-2-2-5 5 2Z"
        {...common}
      />
    ),
    line: <path d="M5 19 19 5" {...common} />,
    capsule: <rect x="3" y="7" width="18" height="10" rx="5" {...common} />,
    oval: <ellipse cx="12" cy="12" rx="9" ry="5.5" {...common} />,
    triangleDown: polygon("4,5 20,5 12,20"),
    triangleLeft: polygon("19,4 4,12 19,20"),
    triangleRight: polygon("5,4 20,12 5,20"),
    teardrop: (
      <path d="M12 3C10 7 5 10 5 15a7 7 0 0 0 14 0c0-5-5-8-7-12Z" {...common} />
    ),
    shield: (
      <path d="M12 3 20 6v5c0 5-3.3 8.2-8 10-4.7-1.8-8-5-8-10V6Z" {...common} />
    ),
    badge: (
      <path
        d="m12 3 2.2 2.1 3-.4.7 2.9 2.6 1.5-1.4 2.7 1.4 2.7-2.6 1.5-.7 2.9-3-.4L12 21l-2.2-2.1-3 .4-.7-2.9-2.6-1.5 1.4-2.7-1.4-2.7 2.6-1.5.7-2.9 3 .4Z"
        {...common}
      />
    ),
    tag: <path d="M4 5h8l8 7-8 7H4l5-7Z" {...common} />,
    flag: <path d="M6 21V4m0 1h12l-3 4 3 4H6" {...common} />,
    ribbon: (
      <>
        <path d="M7 4h10v8a5 5 0 0 1-10 0Z" {...common} />
        <path d="m7 14-2 7 7-4 7 4-2-7" {...common} />
      </>
    ),
    semicircle: <path d="M4 16a8 8 0 0 1 16 0Z" {...common} />,
    quarterCircle: <path d="M5 19V5h14" {...common} />,
    pie: (
      <path d="M12 3v9h9A9 9 0 0 0 12 3ZM12 12v9a9 9 0 0 0 9-9Z" {...common} />
    ),
    arc: <path d="M4 16a9 9 0 0 1 16 0" {...common} />,
    infinity: (
      <path
        d="M7.5 8C4 8 3 12 6 15c3 3 5-3 6-3s3 6 6 3c3-3 2-7-1.5-7-2.5 0-3.5 4-4.5 4s-2-4-4.5-4Z"
        {...common}
      />
    ),
  };
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
      {paths[shape] || paths.rectangle}
    </svg>
  );
}
const PRESETS = [
  "Fade In",
  "Pop In",
  "Zoom In",
  "Slide In",
  "Bounce In",
  "Pulse",
  "Bounce",
  "Float",
  "Swing",
  "Shake",
  "Wobble",
  "Spin",
  "Heartbeat",
  "Glow",
  "Fade Out",
  "Zoom Out",
  "Slide Out",
  "Pop Out",
];
const TOOL_ICONS = {
  Image: IoImageOutline,
  Text: IoTextOutline,
  Emoji: IoHappyOutline,
  Stickers: IoSparklesOutline,
  Shapes: IoShapesOutline,
  Drawing: IoBrushOutline,
  "Remove BG": IoScanOutline,
  Crop: IoCropOutline,
  Mask: IoScanOutline,
  Filters: IoColorFilterOutline,
  Effects: IoOptionsOutline,
  Align: IoOptionsOutline,
  Distribute: IoOptionsOutline,
  Group: IoScanOutline,
  Ungroup: IoScanOutline,
};

function LayerRow({
  item,
  selected,
  onSelect,
  onToggleVisibility,
  onToggleLock,
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border border-border dark:border-border-dark px-3 py-2 text-sm ${selected ? "border-primary bg-primary/10" : ""}`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="min-w-0 flex-1 truncate text-left"
      >
        {item.name || item.type}
      </button>
      <button
        type="button"
        onClick={onToggleVisibility}
        aria-label="Toggle layer visibility"
      >
        {item.visible ? (
          <IoEyeOutline size={16} />
        ) : (
          <IoEyeOffOutline size={16} />
        )}
      </button>
      <button
        type="button"
        onClick={onToggleLock}
        aria-label="Toggle layer lock"
      >
        {item.locked ? (
          <IoLockClosedOutline size={16} />
        ) : (
          <IoLockOpenOutline size={16} />
        )}
      </button>
    </div>
  );
}

function EffectsControls({ outline, shadow, onChange }) {
  const setOutline = (values, key) =>
    onChange(
      (current) => ({
        ...current,
        effects: {
          ...current.effects,
          outline: { ...current.effects.outline, ...values },
        },
      }),
      key,
    );
  const setShadow = (values, key) =>
    onChange(
      (current) => ({
        ...current,
        effects: {
          ...current.effects,
          shadow: { ...current.effects.shadow, ...values },
        },
      }),
      key,
    );
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={Boolean(outline.enabled)}
          onChange={(event) => setOutline({ enabled: event.target.checked })}
        />
        Alpha-boundary outline
      </label>
      <label className="flex items-center gap-2 text-xs">
        Outline color
        <input
          type="color"
          value={outline.color || "#ffffff"}
          onChange={(event) =>
            setOutline({ color: event.target.value }, "outline-color")
          }
          className="border-0 rounded"
        />
      </label>
      <label className="block text-xs">
        Outline width
        <input
          type="range"
          min="1"
          max="24"
          value={outline.width || 1}
          onChange={(event) =>
            setOutline({ width: Number(event.target.value) }, "outline-width")
          }
          className="w-full flex-1 h-1.5 accent-primary [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:scale-75 [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:scale-75"
        />
      </label>
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={Boolean(shadow.enabled)}
          onChange={(event) => setShadow({ enabled: event.target.checked })}
        />
        Shadow
      </label>
      {shadow.enabled && (
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <label>
            Color
            <input
              type="color"
              value={shadow.color || "#000000"}
              onChange={(event) =>
                setShadow({ color: event.target.value }, "shadow-color")
              }
              className="block border-0 rounded"
            />
          </label>
          <label>
            Blur
            <input
              type="range"
              min="0"
              max="40"
              value={shadow.blur || 0}
              onChange={(event) =>
                setShadow({ blur: Number(event.target.value) }, "shadow-blur")
              }
              className="w-full flex-1 h-1.5 accent-primary [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:scale-75 [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:scale-75"
            />
          </label>
          <label>
            Offset X
            <input
              type="range"
              min="-40"
              max="40"
              value={shadow.offsetX || 0}
              onChange={(event) =>
                setShadow({ offsetX: Number(event.target.value) }, "shadow-x")
              }
              className="w-full flex-1 h-1.5 accent-primary [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:scale-75 [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:scale-75"
            />
          </label>
          <label>
            Offset Y
            <input
              type="range"
              min="-40"
              max="40"
              value={shadow.offsetY || 0}
              onChange={(event) =>
                setShadow({ offsetY: Number(event.target.value) }, "shadow-y")
              }
              className="w-full flex-1 h-1.5 accent-primary [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:scale-75 [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:scale-75"
            />
          </label>
          <label className="col-span-2">
            Opacity
            <input
              type="range"
              min="0"
              max="1"
              step=".05"
              value={shadow.opacity ?? 1}
              onChange={(event) =>
                setShadow(
                  { opacity: Number(event.target.value) },
                  "shadow-opacity",
                )
              }
              className="w-full flex-1 h-1.5 accent-primary [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:scale-75 [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:scale-75"
            />
          </label>
        </div>
      )}
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  readout,
  onChange,
  coalesceKey,
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-text-secondary dark:text-text-secondary-dark">
      <span className="w-20 shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value), coalesceKey)}
        className="min-w-0 flex-1 h-1.5 accent-primary [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:scale-75 [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:scale-75"
      />
      <span className="w-12 shrink-0 text-right tabular-nums">{readout}</span>
    </label>
  );
}

const FILTER_PRESETS = [
  ["Original", null],
  ["Vivid", { saturation: 1.45, contrast: 1.12 }],
  ["Soft", { brightness: 1.08, contrast: 0.94, blur: 0.6 }],
  ["Mono", { grayscale: 1, contrast: 1.05 }],
  ["Vintage", { sepia: 0.6, contrast: 1.08, saturation: 0.85 }],
];

const FILTER_SLIDERS = [
  ["Brightness", "brightness", 0, 2, 0.05, 1],
  ["Contrast", "contrast", 0, 2, 0.05, 1],
  ["Saturation", "saturation", 0, 3, 0.05, 1],
  ["Blur", "blur", 0, 40, 1, 0],
  ["Grayscale", "grayscale", 0, 1, 0.05, 0],
  ["Sepia", "sepia", 0, 1, 0.05, 0],
];

function FilterControls({ object, onUpdate }) {
  if (object?.type !== "image")
    return (
      <p className="rounded-lg border border-dashed border-border dark:border-border-dark p-3 text-xs text-text-secondary">
        Select an image layer to adjust its colours.
      </p>
    );
  const filters = object.filters || {};
  const active = FILTER_SLIDERS.some(
    ([, key, , , , neutral]) =>
      Number.isFinite(filters[key]) && filters[key] !== neutral,
  );
  const setFilters = (values, coalesceKey) =>
    onUpdate(
      (item) => ({
        ...item,
        filters: values ? { ...item.filters, ...values } : undefined,
      }),
      coalesceKey,
    );
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        {FILTER_PRESETS.map(([label, preset]) => (
          <button
            type="button"
            key={label}
            onClick={() =>
              onUpdate((item) => ({
                ...item,
                filters: preset ? { ...preset } : undefined,
              }))
            }
            className="rounded-full pt-1.5 border border-border px-2.5 py-1 text-xs font-semibold hover:border-primary dark:border-border-dark"
          >
            {label}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {FILTER_SLIDERS.map(([label, key, min, max, step, neutral]) => {
          const value = Number.isFinite(filters[key]) ? filters[key] : neutral;
          return (
            <SliderRow
              key={key}
              label={label}
              min={min}
              max={max}
              step={step}
              value={value}
              readout={
                key === "blur"
                  ? `${Math.round(value)}px`
                  : `${Math.round(value * 100)}%`
              }
              coalesceKey={`filter-${key}`}
              onChange={(next, coalesceKey) =>
                setFilters({ [key]: next }, coalesceKey)
              }
            />
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => setFilters(null)}
        disabled={!active}
        className="w-full rounded-lg border border-border dark:border-border-dark px-3 py-2 text-sm font-semibold disabled:opacity-40"
      >
        Reset adjustments
      </button>
    </div>
  );
}

const FULL_CROP = { x: 0, y: 0, width: 1, height: 1 };
const MIN_CROP = 0.05;

function readCrop(object) {
  const crop = object?.crop;
  if (!crop || typeof crop !== "object") return FULL_CROP;
  const usable = ["x", "y", "width", "height"].every((key) =>
    Number.isFinite(crop[key]),
  );
  return usable && crop.width > 0 && crop.height > 0 ? crop : FULL_CROP;
}

function CropControls({ object, onUpdate }) {
  if (object?.type !== "image")
    return (
      <p className="rounded-lg border border-dashed border-border dark:border-border-dark p-3 text-xs text-text-secondary dark:text-secondary-dark">
        Select an image layer to crop it.
      </p>
    );
  const crop = readCrop(object);
  const applyCrop = (values, coalesceKey) => {
    const merged = { ...crop, ...values };
    const width = Math.min(1, Math.max(MIN_CROP, merged.width));
    const height = Math.min(1, Math.max(MIN_CROP, merged.height));
    const x = Math.min(1 - width, Math.max(0, merged.x));
    const y = Math.min(1 - height, Math.max(0, merged.y));
    const whole = width > 0.999 && height > 0.999;
    onUpdate((item) => {
      const from = readCrop(item);
      return {
        ...item,
        crop: whole ? undefined : { x, y, width, height },
        width: Math.max(1, Math.round(item.width * (width / from.width))),
        height: Math.max(1, Math.round(item.height * (height / from.height))),
      };
    }, coalesceKey);
  };
  // Aspect is solved in box space - the frame we can measure - so no natural
  // image size is needed and the result is exact for an undistorted layer.
  const applyAspect = (target) => {
    const ratio = object.width / Math.max(1, object.height);
    const rw = ratio > target ? target / ratio : 1;
    const rh = ratio > target ? 1 : ratio / target;
    applyCrop({
      x: crop.x + (crop.width * (1 - rw)) / 2,
      y: crop.y + (crop.height * (1 - rh)) / 2,
      width: crop.width * rw,
      height: crop.height * rh,
    });
  };
  const inset = {
    left: Math.round(crop.x * 100),
    right: Math.round((1 - crop.x - crop.width) * 100),
    top: Math.round(crop.y * 100),
    bottom: Math.round((1 - crop.y - crop.height) * 100),
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {[
          ["1:1", 1],
          ["4:5", 0.8],
          ["3:2", 1.5],
          ["16:9", 16 / 9],
        ].map(([label, target]) => (
          <button
            type="button"
            key={label}
            onClick={() => applyAspect(target)}
            className="rounded-full border border-border px-2.5 py-1 text-xs font-semibold hover:border-primary dark:border-border-dark"
          >
            {label}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {[
          [
            "Left",
            "left",
            (value) => ({ x: value, width: crop.width + (crop.x - value) }),
          ],
          ["Right", "right", (value) => ({ width: 1 - crop.x - value })],
          [
            "Top",
            "top",
            (value) => ({ y: value, height: crop.height + (crop.y - value) }),
          ],
          ["Bottom", "bottom", (value) => ({ height: 1 - crop.y - value })],
        ].map(([label, key, toCrop]) => (
          <SliderRow
            key={key}
            label={label}
            min={0}
            max={95}
            value={inset[key]}
            readout={`${inset[key]}%`}
            coalesceKey={`crop-${key}`}
            onChange={(next, coalesceKey) =>
              applyCrop(toCrop(next / 100), coalesceKey)
            }
          />
        ))}
      </div>
      <button
        type="button"
        onClick={() => applyCrop(FULL_CROP)}
        disabled={crop === FULL_CROP}
        className="w-full rounded-lg border border-border dark:border-border-dark px-3 py-2 text-sm font-semibold disabled:opacity-40"
      >
        Reset crop
      </button>
    </div>
  );
}

const FONT_FAMILIES = [
  ["Inter", "Inter, system-ui, sans-serif"],
  ["System", "system-ui, sans-serif"],
  ["Mono", "'JetBrains Mono', ui-monospace, monospace"],
  ["Serif", "Georgia, 'Times New Roman', serif"],
  ["Impact", "Impact, 'Arial Black', sans-serif"],
  ["Verdana", "Verdana, Geneva, sans-serif"],
];

function TextControls({ object, onUpdate }) {
  if (object?.type !== "text")
    return (
      <p className="rounded-lg border border-dashed border-border p-3 text-xs text-text-secondary">
        Select a text layer to change its typography.
      </p>
    );
  const set = (values, coalesceKey) =>
    onUpdate((item) => ({ ...item, ...values }), coalesceKey);
  const bold =
    Number(object.fontWeight ?? 800) >= 600 || object.fontWeight === "bold";
  const toggles = [
    ["Bold", bold, () => set({ fontWeight: bold ? 400 : 800 })],
    [
      "Italic",
      object.fontStyle === "italic",
      () =>
        set({ fontStyle: object.fontStyle === "italic" ? "normal" : "italic" }),
    ],
  ];
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
        <label className="block min-w-0 text-sm text-text-secondary dark:text-text-secondary-dark">
          Font
          <select
            value={object.fontFamily || FONT_FAMILIES[0][1]}
            onChange={(event) => set({ fontFamily: event.target.value })}
            className="mt-1 w-full rounded-lg border border-border dark:border-border-dark bg-surface dark:bg-surface-dark px-1 py-2 text-sm"
          >
            {FONT_FAMILIES.map(([label, value]) => (
              <option key={label} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col items-center gap-1 text-sm text-text-secondary dark:text-text-secondary-dark">
          <span>Color</span>
          <input
            type="color"
            value={object.color || "#ffffff"}
            onChange={(event) =>
              set({ color: event.target.value }, "text-color")
            }
            aria-label="Text color"
            title="Choose text color"
            className="w-16 h-[32px] cursor-pointer rounded-md border border-border dark:border-border-dark bg-transparent p-0.5"
          />
        </label>
      </div>
      <div className="flex gap-1">
        {toggles.map(([label, on, toggle]) => (
          <button
            type="button"
            key={label}
            onClick={toggle}
            aria-pressed={on}
            className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-semibold ${on ? "border-primary bg-primary/10 text-primary" : "border-border dark:border-border-dark"}`}
          >
            {label}
          </button>
        ))}
        {["left", "center", "right"].map((align) => (
          <button
            type="button"
            key={align}
            onClick={() => set({ textAlign: align })}
            aria-pressed={(object.textAlign || "center") === align}
            aria-label={`Align ${align}`}
            className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-semibold capitalize ${(object.textAlign || "center") === align ? "border-primary bg-primary/10 text-primary" : "border-border dark:border-border-dark"}`}
          >
            {align[0].toUpperCase()}
          </button>
        ))}
      </div>
      <SliderRow
        label="Size"
        min={8}
        max={220}
        value={object.fontSize || 52}
        readout={`${Math.round(object.fontSize || 52)}px`}
        coalesceKey="text-fontSize"
        onChange={(value, coalesceKey) => set({ fontSize: value }, coalesceKey)}
      />
      <SliderRow
        label="Line height"
        min={0.8}
        max={2.5}
        step={0.05}
        value={Number.isFinite(object.lineHeight) ? object.lineHeight : 1}
        readout={(Number.isFinite(object.lineHeight)
          ? object.lineHeight
          : 1
        ).toFixed(2)}
        coalesceKey="text-lineHeight"
        onChange={(value, coalesceKey) =>
          set({ lineHeight: value }, coalesceKey)
        }
      />
      <SliderRow
        label="Tracking"
        min={-10}
        max={40}
        value={Number.isFinite(object.letterSpacing) ? object.letterSpacing : 0}
        readout={`${Math.round(object.letterSpacing || 0)}px`}
        coalesceKey="text-letterSpacing"
        onChange={(value, coalesceKey) =>
          set({ letterSpacing: value }, coalesceKey)
        }
      />
    </div>
  );
}

export default function StickerStudioSidebar({
  project,
  selectedIds,
  selected,
  one,
  tool,
  panel,
  onSetTool,
  activeSidebarSection = "Image",
  onSetActiveSidebarSection,
  onSetPanel,
  onAdd,
  imageInputRef,
  onAddImages,
  recentEmojis,
  recentImages = [],
  onAddRecentImage,
  onRemoveRecentImage,
  stockResults = [],
  stockLoading = false,
  stockError = "",
  onSearchStockImages,
  onAddStockImage,
  emojiButtonRef,
  emojiPickerOpen,
  emojiPickerPosition,
  onOpenEmojiPicker,
  onCloseEmojiPicker,
  search,
  onSetSearch,
  category,
  onSetCategory,
  stickers,
  stickerLoading,
  onAddSticker,
  onUseSavedSticker,
  onEditSavedSticker,
  onUpdateObjects,
  onProjectChange,
  onRemoveBackground,
  backgroundRemoving,
  backgroundError,
  drawingState = {},
  onSetDrawingSetting,
  drawingCount = 0,
  onClearDrawing,
  onMoveLayer,
  onToggleLayerLock,
  onSelectIds,
  onAlign,
  onDistribute,
  onGroup,
  onUngroup,
  onCreateCompositeSticker,
  preset,
  onSetPreset,
  onApplyAnimation,
  time,
  onAddKeyframe,
}) {
  const [imageTab, setImageTab] = useState("upload");
  const [dropActive, setDropActive] = useState(false);
  const [stickerTab, setStickerTab] = useState("catalog");
  const [stockQuery, setStockQuery] = useState("nature");
  const changeImageTab = (value) => {
    setImageTab(value);
    if (value === "stock" && !stockResults.length && !stockLoading)
      onSearchStockImages?.(stockQuery);
  };
  const selectTool = (toolName) => {
    onCloseEmojiPicker?.();
    onSetActiveSidebarSection?.(toolName);
    if (toolName === "Drawing") onSetTool?.("draw");
    else if (tool === "draw" || tool === "erase") onSetTool?.("select");
    if (toolName === "Effects") onSetPanel("effects");
    if (["Align", "Distribute", "Group", "Ungroup", "Mask"].includes(toolName))
      onSetPanel("layers");
    const target =
      toolName === "Stickers"
        ? "sticker-browser"
        : toolName === "Shapes"
          ? "shape-tools"
          : toolName === "Drawing"
            ? "draw-tools"
            : ["Image", "Text", "Emoji"].includes(toolName)
              ? "asset-tools"
              : "arrange-tools";
    requestAnimationFrame(() =>
      document
        .getElementById(target)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
    );
  };
  const updateProject = (updater, coalesceKey) =>
    onProjectChange(updater, { coalesceKey });
  const addText = () =>
    onAdd({
      type: "text",
      text: "That's me!",
      width: 220,
      height: 80,
      fontSize: 52,
      color: "#ffffff",
    });
  const addEmoji = (emoji) =>
    onAdd({
      type: "text",
      text: emoji,
      width: 140,
      height: 140,
      fontSize: 120,
      color: "#ffffff",
    });
  const outline = project.effects?.outline || {};
  const shadow = project.effects?.shadow || {};
  return (
    <>
      <nav
        className="order-1 flex h-14 w-full shrink-0 flex-row items-center gap-1 overflow-x-auto border-b border-border bg-background px-2 py-1 md:col-start-1 md:row-start-2 md:row-span-2 md:h-auto md:w-auto md:flex-col md:items-stretch md:overflow-y-auto md:overflow-x-hidden md:border-b-0 md:border-r md:px-3 md:py-5 dark:border-border-dark dark:bg-background-dark scrollbar-hide"
        aria-label="Sticker Studio tools"
      >
        {["CREATE", "DRAW", "AI", "EDIT", "LAYOUT"].map((groupName) => (
          <div
            key={groupName}
            className="mt-0 flex w-auto shrink-0 items-center gap-1 md:mt-2 md:block md:w-full md:border-t md:border-border md:pt-5 md:first:mt-0 md:first:border-t-0 md:first:pt-0 dark:md:border-border-dark"
          >
            <div className="hidden -mt-3 text-left text-sm font-bold tracking-wide text-primary md:block">
              {groupName}
            </div>
            {(groupName === "CREATE"
              ? ["Image", "Text", "Emoji", "Stickers", "Shapes"]
              : groupName === "DRAW"
                ? ["Drawing"]
                : groupName === "AI"
                  ? ["Remove BG"]
                  : groupName === "EDIT"
                    ? ["Crop", "Mask", "Filters", "Effects"]
                    : ["Align", "Distribute", "Group", "Ungroup"]
            ).map((toolName) => {
              const ToolIcon = TOOL_ICONS[toolName] || IoSparklesOutline;
              return (
                <button
                  type="button"
                  key={toolName}
                  title={toolName}
                  aria-label={toolName}
                  onClick={() => selectTool(toolName)}
                  className={`group flex w-full flex-row items-center gap-2 rounded-md p-1 text-left text-sm font-semibold text-text-primary transition-colors hover:bg-primary/10 hover:text-primary dark:text-text-primary-dark ${activeSidebarSection === toolName ? "bg-primary/10 text-primary" : ""}`}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xl font-semibold text-primary group-hover:bg-primary/10 dark:bg-primary-dark/10">
                    <ToolIcon aria-hidden="true" />
                  </span>
                  <span className="truncate">{toolName}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <aside className="order-1 flex min-h-0 w-full shrink-0 flex-col gap-0 overflow-y-auto border-border bg-surface px-2 md:col-start-2 md:row-start-2 md:w-auto md:overflow-y-auto dark:border-border-dark dark:bg-surface-dark scrollbar-hide">
        <h3 className="border-b border-border p-2 bg-surface dark:bg-surface-dark text-xl font-semibold tracking-tight text-text-primary dark:border-border-dark dark:text-text-primary-dark">
          {{
            Image: "Images",
            Text: "Text",
            Emoji: "Emoji",
            Stickers: "Stickers",
            Shapes: "Shapes",
            Drawing: "Drawing",
            "Remove BG": "Remove Background",
            Crop: "Crop",
            Mask: "Mask",
            Filters: "Filters",
            Effects: "Effects",
            Align: "Align",
            Distribute: "Distribute",
            Group: "Group",
            Ungroup: "Ungroup",
          }[activeSidebarSection] || "Sticker Studio"}
        </h3>
        {activeSidebarSection === "Image" && (
          <div className="p-2">
            <div className="flex border-b bg-surface dark:bg-surface-dark border-border text-sm dark:border-border-dark">
              {[
                ["upload", "Upload"],
                ["recent", "Recent"],
                ["stock", "Stock"],
              ].map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => changeImageTab(value)}
                  className={`flex-1 border-b-2 p-2 text-center font-semibold ${imageTab === value ? "border-primary text-primary" : "border-transparent text-text-secondary dark:text-secondary-dark"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {imageTab === "upload" && (
              <>
                {/* A real drop target: the label promised drag and drop long
                    before anything listened for it. */}
                <div
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDropActive(true);
                  }}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setDropActive(true);
                  }}
                  onDragLeave={() => setDropActive(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDropActive(false);
                    const files = [...(event.dataTransfer?.files || [])];
                    if (files.length) onAddImages?.(files);
                  }}
                  className={`mt-3 rounded-2xl border border-dashed py-4 text-center transition ${dropActive ? "border-primary bg-primary/10" : "border-border bg-surface-muted/20 dark:border-border-dark dark:bg-surface-muted-dark/20"}`}
                >
                  <IoCloudUploadOutline size={32} className="mx-auto mb-1" />
                  <p className="text-sm font-medium">
                    {dropActive
                      ? "Drop to add images"
                      : "Drag & drop images here"}
                  </p>
                  <p className="my-1 text-sm">or</p>
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="inline-flex min-h-11 items-center rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                  >
                    <IoCloudUploadOutline size={18} className="mr-2" />
                    Upload Images
                  </button>
                  <p className="mt-2 text-[10px] text-text-secondary">
                    PNG, JPG, WEBP or GIF · up to 10 MB each
                  </p>
                </div>
                <input
                  ref={imageInputRef}
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={onAddImages}
                />
              </>
            )}
            {imageTab === "recent" && (
              <>
                {recentImages.length ? (
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    {recentImages.map((asset) => (
                      <div
                        key={asset.id}
                        className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-surface p-1 shadow-sm dark:border-border-dark dark:bg-surface-dark"
                      >
                        <button
                          type="button"
                          onClick={() => onAddRecentImage?.(asset)}
                          className="h-full w-full"
                          aria-label={`Add ${asset.name || "recent image"}`}
                        >
                          <img
                            src={asset.src}
                            alt={asset.name || "Recent upload"}
                            className="h-full w-full object-contain"
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveRecentImage?.(asset.id)}
                          aria-label={`Remove ${asset.name || "recent image"}`}
                          title="Remove from recent"
                          className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-300 text-red-700 text-lg leading-none opacity-0 transition group-hover:opacity-100"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-8 flex items-center justify-center p-4 text-md text-text-secondary">
                    Upload an image to see it here.
                  </div>
                )}
              </>
            )}
            {imageTab === "stock" && (
              <div className="mt-2">
                <div className="flex gap-2">
                  <input
                    value={stockQuery}
                    onChange={(event) => setStockQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter")
                        onSearchStockImages?.(stockQuery);
                    }}
                    placeholder="Search stock photos..."
                    aria-label="Search stock photos"
                    className="min-w-0 flex-1 rounded-lg bg-background dark:bg-background-dark border border-border dark:border-border-dark px-3 py-2 text-sm outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => onSearchStockImages?.(stockQuery)}
                    disabled={stockLoading}
                    className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Search
                  </button>
                </div>
                <p className="mt-2 text-xs text-text-secondary">
                  Photos from Pexels. Click a photo to add it to the canvas.
                </p>
                {stockError && (
                  <div
                    className="mt-3 rounded-xl border border-danger/30 bg-danger/5 p-3 text-xs text-danger"
                    role="alert"
                  >
                    {stockError}
                    <button
                      type="button"
                      onClick={() => onSearchStockImages?.(stockQuery)}
                      className="ml-2 font-semibold underline"
                    >
                      Retry
                    </button>
                  </div>
                )}
                {stockLoading && (
                  <p className="py-6 text-center text-xs text-text-secondary">
                    Searching stock photos…
                  </p>
                )}
                {!stockLoading && !stockError && !stockResults.length && (
                  <div className="mt-4 rounded-xl border border-dashed border-border p-4 text-center text-xs text-text-secondary">
                    Search for a photo to get started.
                  </div>
                )}
                {!stockLoading && stockResults.length > 0 && (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {stockResults.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => onAddStockImage?.(item)}
                        className="group aspect-square overflow-hidden rounded-lg border border-border bg-surface shadow-sm hover:border-primary"
                      >
                        <img
                          src={item.thumbnail || item.url}
                          alt={item.title || "Stock photo"}
                          className="h-full w-full object-cover transition group-hover:scale-105"
                        />
                        <span className="sr-only">
                          {item.title || "Stock photo"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {activeSidebarSection === "Text" && (
          <div className="space-y-2 px-2 py-1">
            <p className="text-sm text-text-secondary dark:text-secondary-dark">
              Add editable text layers to the canvas.
            </p>
            <div className="grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() =>
                  onAdd({
                    type: "text",
                    text: "Heading",
                    width: 260,
                    height: 90,
                    fontSize: 64,
                    color: "#111827",
                  })
                }
                className="w-full rounded-md border border-primary/30 bg-primary/5 px-1 py-1.5 text-sm font-semibold text-primary hover:bg-primary/10"
              >
                Add heading
              </button>
              <button
                type="button"
                onClick={() =>
                  onAdd({
                    type: "text",
                    text: "Subheading",
                    width: 240,
                    height: 70,
                    fontSize: 42,
                    color: "#111827",
                  })
                }
                className="w-full rounded-md border border-border px-1 py-1.5 text-sm font-semibold hover:border-primary"
              >
                Subheading
              </button>
              <button
                type="button"
                onClick={addText}
                className="w-full rounded-md border border-border px-1 py-1.5 text-sm font-semibold hover:border-primary"
              >
                Add body text
              </button>
            </div>
            {one?.type === "text" && (
              <>
                <textarea
                  value={one.text || ""}
                  onChange={(event) =>
                    onUpdateObjects((item) => ({
                      ...item,
                      text: event.target.value.slice(0, 240),
                    }))
                  }
                  aria-label="Text content"
                  rows="3"
                  className="w-full rounded-lg border border-border dark:border-border-dark px-2 py-1 text-sm outline-none"
                />
                <TextControls object={one} onUpdate={onUpdateObjects} />
              </>
            )}
          </div>
        )}
        {activeSidebarSection === "Emoji" && (
          <div className="px-2 py-1">
            <p className="mb-2 text-sm text-text-secondary dark:text-secondary-dark">
              Choose any emoji and add multiple emoji layers.
            </p>
            <div className="grid grid-cols-5 gap-2">
              {recentEmojis.map((emoji) => (
                <button
                  type="button"
                  key={emoji}
                  onClick={() => addEmoji(emoji)}
                  aria-label={`Add emoji ${emoji}`}
                  className="flex aspect-square items-center justify-center rounded-lg border border-border dark:border-border-dark text-5xl hover:border-primary hover:bg-primary/5"
                >
                  {emoji}
                </button>
              ))}
              <button
                type="button"
                ref={emojiButtonRef}
                onClick={onOpenEmojiPicker}
                aria-label="Open emoji picker"
                aria-expanded={emojiPickerOpen}
                className="flex aspect-square items-center justify-center rounded-lg border border-primary text-4xl text-primary"
              >
                <IoAddOutline />
              </button>
            </div>
            {emojiPickerOpen &&
              emojiPickerPosition &&
              createPortal(
                <div
                  className="fixed inset-0 z-[9999]"
                  onMouseDown={(event) => {
                    if (event.target === event.currentTarget)
                      onCloseEmojiPicker();
                  }}
                >
                  <div
                    className="fixed max-w-[calc(100vw-1rem)] overflow-hidden rounded-lg shadow-xl"
                    style={{
                      left:
                        window.innerWidth <= 640 ? 8 : emojiPickerPosition.left,
                      top: 8,
                      width: emojiPickerPosition.width,
                    }}
                  >
                    <Picker
                      data={emojiData}
                      onEmojiSelect={(emoji) => {
                        addEmoji(emoji.native);
                        onCloseEmojiPicker();
                      }}
                      theme="auto"
                      set="native"
                      previewPosition="none"
                      searchPosition="top"
                      skinTonePosition="none"
                      perLine={8}
                      emojiSize={22}
                    />
                  </div>
                </div>,
                document.body,
              )}
          </div>
        )}
        {activeSidebarSection === "Stickers" && (
          <div id="sticker-browser" className="py-2 px-2">
            {/* The shared AI catalogue and the user's own saved stickers are two
                different collections, so they get two tabs rather than one
                merged grid that hides which is which. */}
            <div className="mb-2 flex border-b border-border text-sm dark:border-border-dark">
              {[
                ["catalog", "Catalog"],
                ["library", "My Stickers"],
              ].map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setStickerTab(value)}
                  aria-pressed={stickerTab === value}
                  className={`flex-1 border-b-2 p-2 text-center font-semibold ${stickerTab === value ? "border-primary text-primary" : "border-transparent text-text-secondary dark:text-secondary-dark"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {stickerTab === "library" ? (
              <StickerLibrary
                columns={3}
                onUse={onUseSavedSticker}
                onEdit={onEditSavedSticker}
              />
            ) : (
              <>
                <input
                  value={search}
                  onChange={(event) => onSetSearch(event.target.value)}
                  placeholder="Search stickers..."
                  aria-label="Search stickers"
                  className="mb-2 w-full rounded-lg border border-border dark:border-border-dark bg-background dark:bg-background-dark px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary/30"
                />
                <div className="mb-2 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {STICKER_CATEGORIES.slice(0, 6).map((item) => (
                    <button
                      type="button"
                      key={item}
                      onClick={() => {
                        onSetCategory(item);
                        onSetSearch(item);
                      }}
                      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs ${category === item ? "border-primary bg-primary/5 font-semibold text-primary" : "border-border dark:border-border-dark bg-surface dark:bg-surface-dark text-text-secondary dark:text-secondary-dark"}`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                {stickerLoading && (
                  <p className="py-2 text-center text-xs text-text-secondary">
                    Loading stickers…
                  </p>
                )}
                <div className="grid grid-cols-4 gap-2">
                  {(stickers.length
                    ? stickers
                    : getFallbackStickers(category, 12)
                  )
                    .slice(0, 12)
                    .map((item) => (
                      <button
                        type="button"
                        key={item.id || getStickerPreview(item)}
                        onClick={() => onAddSticker(item)}
                        disabled={stickerLoading}
                        className="aspect-square rounded-lg border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-2 shadow-sm hover:border-primary disabled:opacity-50"
                      >
                        <img
                          src={getStickerPreview(item)}
                          alt={item.title || "Sticker"}
                          className="h-full w-full object-contain"
                        />
                      </button>
                    ))}
                </div>
              </>
            )}
          </div>
        )}
        {activeSidebarSection === "Shapes" && (
          <div id="shape-tools" className="grid grid-cols-5 gap-1 p-2">
            {SHAPES.map((shape) => (
              <button
                type="button"
                key={shape}
                aria-label={`Add ${shapeLabel(shape)}`}
                title={`Add ${shapeLabel(shape)}`}
                onClick={() =>
                  onAdd({
                    type: "shape",
                    shape,
                    width: 150,
                    height: 120,
                    color: "#3b5bff",
                  })
                }
                className="flex aspect-square items-center justify-center rounded-lg border border-border dark:border-border-dark text-3xl text-text-secondary dark:text-secondary-dark hover:border-primary hover:bg-primary/5 hover:text-primary"
              >
                <ShapeIcon shape={shape} />
              </button>
            ))}
          </div>
        )}
        {activeSidebarSection === "Drawing" && (
          <DrawingToolbar
            tool={tool}
            onSetTool={onSetTool}
            drawingState={drawingState}
            onSetDrawingSetting={onSetDrawingSetting}
            drawingCount={drawingCount}
            onClearDrawing={onClearDrawing}
          />
        )}
        {activeSidebarSection === "Remove BG" && (
          <div className="space-y-2 p-2">
            <p className="text-sm text-text-secondary dark:text-secondary-dark">
              Remove the background from the selected image using the
              server-side image service.
            </p>
            {one?.type === "image" ? (
              <button
                type="button"
                onClick={onRemoveBackground}
                disabled={backgroundRemoving}
                className="w-full rounded-xl bg-primary px-3 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {backgroundRemoving
                  ? "Removing background…"
                  : "Remove background"}
              </button>
            ) : (
              <p className="rounded-lg border border-dashed border-border dark:border-border-dark p-3 text-sm text-text-secondary dark:text-secondary-dark">
                Select an image on the canvas to continue.
              </p>
            )}
            {backgroundError && (
              <p role="alert" className="text-xs text-danger">
                {backgroundError}
              </p>
            )}
          </div>
        )}
        {activeSidebarSection === "Mask" && (
          <div className="space-y-3 p-2">
            <p className="text-sm text-text-secondary dark:text-secondary-dark">
              Apply a non-destructive mask to the selected object.
            </p>
            {one ? (
              <select
                value={one.mask || "none"}
                onChange={(event) =>
                  onUpdateObjects((item) => ({
                    ...item,
                    mask: event.target.value,
                  }))
                }
                aria-label="Object mask"
                className="w-full rounded-lg border border-border dark:border-border-dark bg-surface dark:bg-surface-dark px-3 py-3 text-sm"
              >
                <option value="none">None</option>
                <option value="circle">Circle</option>
                <option value="rounded">Rounded</option>
                <option value="heart">Heart</option>
                <option value="star">Star</option>
              </select>
            ) : (
              <p className="rounded-lg border border-dashed border-border dark:border-border-dark p-3 text-sm text-text-secondary dark:text-secondary-dark">
                Select an object to edit its mask.
              </p>
            )}
          </div>
        )}
        {activeSidebarSection === "Crop" && (
          <div className="space-y-3 p-2">
            <p className="text-sm text-text-secondary dark:text-secondary-dark">
              Trim the selected image. The original is kept, so a crop can be
              reopened and changed later.
            </p>
            <CropControls object={one} onUpdate={onUpdateObjects} />
          </div>
        )}
        {activeSidebarSection === "Filters" && (
          <div className="space-y-3 p-2">
            <p className="text-sm text-text-secondary dark:text-secondary-dark">
              Adjust the selected image. Preview and export use the same
              renderer, so what you see here is what you get.
            </p>
            <FilterControls object={one} onUpdate={onUpdateObjects} />
          </div>
        )}
        {activeSidebarSection === "Effects" && (
          <div className="space-y-3 p-2">
            <p className="text-sm text-text-secondary dark:text-secondary-dark">
              Edit outline and shadow effects for the composition.
            </p>
            <EffectsControls
              outline={outline}
              shadow={shadow}
              onChange={updateProject}
            />
          </div>
        )}
        {(activeSidebarSection === "Align" ||
          activeSidebarSection === "Distribute" ||
          activeSidebarSection === "Group" ||
          activeSidebarSection === "Ungroup") && (
          <div className="space-y-3 p-2">
            {activeSidebarSection === "Align" && (
              <div className="grid grid-cols-3 gap-1">
                {[
                  ["Left", "left"],
                  ["Center", "centerX"],
                  ["Right", "right"],
                  ["Top", "top"],
                  ["Middle", "centerY"],
                  ["Bottom", "bottom"],
                ].map(([label, mode]) => (
                  <button
                    type="button"
                    key={label}
                    onClick={() => onAlign(mode)}
                    className="rounded border border-border dark:border-border-dark text-foreground dark:text-foreground-dark p-2 text-sm"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            {activeSidebarSection === "Distribute" && (
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => onDistribute("x")}
                  className="rounded border border-border dark:border-border-dark text-foreground dark:text-foreground-dark p-2 text-sm"
                >
                  Distribute X
                </button>
                <button
                  type="button"
                  onClick={() => onDistribute("y")}
                  className="rounded border border-border dark:border-border-dark text-foreground dark:text-foreground-dark p-2 text-sm"
                >
                  Distribute Y
                </button>
              </div>
            )}
            {activeSidebarSection === "Group" && (
              <button
                type="button"
                disabled={selected.length < 2}
                onClick={onGroup}
                className="w-full rounded-lg bg-primary px-3 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                Group selected objects
              </button>
            )}
            {activeSidebarSection === "Ungroup" && (
              <button
                type="button"
                disabled={one?.type !== "group"}
                onClick={onUngroup}
                className="w-full rounded-lg bg-primary px-3 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                Ungroup selected group
              </button>
            )}
          </div>
        )}
      </aside>
      <aside
        id="arrange-tools"
        className="order-3 flex max-h-[38vh] w-full shrink-0 flex-col overflow-y-auto border-t border-border bg-surface p-0 md:col-start-4 md:row-start-2 md:row-span-2 md:max-h-none md:w-auto md:border-l md:border-t-0 dark:border-border-dark dark:bg-surface-dark"
      >
        <div className="sticky top-0 z-10 flex border-b border-border bg-surface px-3 dark:border-border-dark dark:bg-surface-dark">
          {[
            ["layers", "Properties"],
            ["animate", "Animate"],
            ["effects", "Effects"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => onSetPanel(value)}
              className={`flex-1 border-b-2 px-2 py-3 text-md font-semibold ${panel === value ? "border-primary text-text-primary dark:text-primary-dark" : "border-transparent text-text-secondary dark:text-secondary-dark"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {panel === "layers" && (
          <div className="space-y-2 px-4 py-2">
            <div className="text-base font-semibold">Transform</div>
            <button
              type="button"
              onClick={onCreateCompositeSticker}
              disabled={selected.length < 2}
              className="w-full rounded-lg border border-primary/40 bg-primary/5 py-2 text-md font-semibold text-primary disabled:opacity-40"
            >
              Create Composite Sticker
            </button>
            <div className="grid grid-cols-4 gap-1">
              {[
                [1, "Bring forward", IoArrowUp],
                [-1, "Send backward", IoArrowDown],
                ["front", "Bring to front", IoArrowForward],
                ["back", "Send to back", IoArrowBack],
              ].map(([direction, label, Icon]) => (
                <button
                  type="button"
                  key={label}
                  onClick={() => onMoveLayer(direction)}
                  aria-label={label}
                  title={label}
                  className="flex items-center justify-center rounded-lg border border-border dark:border-border-dark text-foreground dark:text-foreground-dark p-2"
                >
                  <Icon size={16} />
                </button>
              ))}
            </div>
            <div className="space-y-1">
              {[...project.objects].reverse().map((item) => (
                <LayerRow
                  key={item.id}
                  item={item}
                  selected={selectedIds.includes(item.id)}
                  onSelect={() => onSelectIds([item.id])}
                  onToggleVisibility={() =>
                    updateProject((current) => ({
                      ...current,
                      objects: current.objects.map((entry) =>
                        entry.id === item.id
                          ? { ...entry, visible: !entry.visible }
                          : entry,
                      ),
                    }))
                  }
                  onToggleLock={() => onToggleLayerLock(item.id)}
                />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-1">
              {[
                ["Left", "left"],
                ["Center", "centerX"],
                ["Right", "right"],
                ["Top", "top"],
                ["Middle", "centerY"],
                ["Bottom", "bottom"],
              ].map(([label, mode]) => (
                <button
                  type="button"
                  key={label}
                  onClick={() => onAlign(mode)}
                  className="rounded-lg border border-border dark:border-border-dark text-foreground dark:text-foreground-dark p-2 text-sm font-semibold"
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => onDistribute("x")}
                className="rounded-lg border border-border dark:border-border-dark text-foreground dark:text-foreground-dark p-2 text-sm font-semibold"
              >
                Distribute X
              </button>
              <button
                type="button"
                onClick={() => onDistribute("y")}
                className="rounded border border-border dark:border-border-dark text-foreground dark:text-foreground-dark p-2 text-sm font-semibold"
              >
                Distribute Y
              </button>
            </div>
            {one && (
              <div className="space-y-2 border-t border-border dark:border-border-dark pt-2">
                <input
                  value={one.name || ""}
                  onChange={(event) =>
                    onUpdateObjects((item) => ({
                      ...item,
                      name: event.target.value.slice(0, 32),
                    }))
                  }
                  className="w-full rounded-lg border border-border dark:border-border-dark text-foreground dark:text-foreground-dark bg-surface dark:bg-surface-dark px-3 py-2 text-sm out-of-range:border-danger focus:outline-none focus:ring-1 focus:ring-primary/30"
                  aria-label="Layer name"
                  placeholder="Layer name"
                />
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ["X", "x"],
                    ["Y", "y"],
                    ["Width", "width"],
                    ["Height", "height"],
                    ["Rotation", "rotation"],
                    ["Opacity", "opacity"],
                  ].map(([label, key]) => (
                    <label key={key} className="text-sm text-text-secondary dark:text-secondary-dark">
                      {label}
                      <input
                        type="number"
                        step={key === "opacity" ? ".05" : "1"}
                        min={key === "opacity" ? 0 : undefined}
                        max={key === "opacity" ? 1 : undefined}
                        value={one[key] ?? 0}
                        onChange={(event) =>
                          onUpdateObjects((item) => ({
                            ...item,
                            [key]: Number(event.target.value),
                          }))
                        }
                        className="w-full rounded-lg border border-border dark:border-border-dark text-foreground dark:text-foreground-dark bg-surface dark:bg-surface-dark px-3 py-2 text-sm outline-none focus:outline-none focus:ring-1 focus:ring-primary/30"
                      />
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateObjects((item) => ({
                        ...item,
                        flipX: !item.flipX,
                      }))
                    }
                    className="flex-1 rounded-lg border border-border dark:border-border-dark text-foreground dark:text-foreground-dark bg-surface dark:bg-surface-dark px-3 py-2 text-sm outline-none focus:outline-none focus:ring-1 focus:ring-primary/30"
                  >
                    Flip X
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateObjects((item) => ({
                        ...item,
                        flipY: !item.flipY,
                      }))
                    }
                    className="flex-1 rounded-lg border border-border dark:border-border-dark text-foreground dark:text-foreground-dark bg-surface dark:bg-surface-dark px-3 py-2 text-sm outline-none focus:outline-none focus:ring-1 focus:ring-primary/30"
                  >
                    Flip Y
                  </button>
                </div>
                {one.type === "text" && (
                  <>
                    <textarea
                      value={one.text || ""}
                      onChange={(event) =>
                        onUpdateObjects((item) => ({
                          ...item,
                          text: event.target.value.slice(0, 240),
                        }))
                      }
                      className="w-full rounded-lg border border-border dark:border-border-dark text-foreground dark:text-foreground-dark bg-surface dark:bg-surface-dark p-2 text-sm outline-none focus:outline-none focus:ring-1 focus:ring-primary/30"
                      aria-label="Text content"
                      rows="2"
                    />
                    <TextControls object={one} onUpdate={onUpdateObjects} />
                  </>
                )}
                {one.type === "image" && (
                  <>
                    <button
                      type="button"
                      onClick={onRemoveBackground}
                      disabled={backgroundRemoving}
                      className="w-full rounded-lg border border-border dark:border-border-dark text-foreground dark:text-foreground-dark bg-surface dark:bg-surface-dark p-2 text-sm font-semibold disabled:opacity-50 outline-none focus:outline-none focus:ring-1 focus:ring-primary/30"
                    >
                      {backgroundRemoving
                        ? "Removing background…"
                        : "Remove background"}
                    </button>
                    {backgroundError && (
                      <p role="alert" className="text-xs text-danger">
                        {backgroundError}
                      </p>
                    )}
                    <div className="border-t border-border dark:border-border-dark pt-2">
                      <h4 className="mb-2 text-base font-semibold">Crop</h4>
                      <CropControls object={one} onUpdate={onUpdateObjects} />
                    </div>
                    <div className="border-t border-border dark:border-border-dark pt-2">
                      <h4 className="mb-2 text-base font-semibold">Adjust</h4>
                      <FilterControls object={one} onUpdate={onUpdateObjects} />
                    </div>
                  </>
                )}
                <div className="border-t border-border dark:border-border-dark pt-4">
                  <h4 className="mb-3 text-base font-semibold">Appearance</h4>
                  <label className="flex items-center gap-3 text-xs text-text-secondary">
                    <span className="w-16 shrink-0">Opacity</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step=".05"
                      value={one.opacity ?? 1}
                      onChange={(event) =>
                        onUpdateObjects((item) => ({
                          ...item,
                          opacity: Number(event.target.value),
                        }))
                      }
                      className="min-w-0 flex-1 accent-primary [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary"
                    />
                    <span className="w-14 rounded-xl border border-border px-2 py-2 text-center text-xs">
                      {Math.round((one.opacity ?? 1) * 100)}%
                    </span>
                  </label>
                  <label className="mt-2 flex items-center gap-3 text-xs text-text-secondary">
                    <span className="w-16 shrink-0">Blend</span>
                    <select
                      value={one.blendMode || "source-over"}
                      onChange={(event) =>
                        onUpdateObjects((item) => ({
                          ...item,
                          blendMode: event.target.value,
                        }))
                      }
                      aria-label="Blend mode"
                      className="min-w-0 flex-1 rounded-lg border border-border dark:border-border-dark text-foreground dark:text-foreground-dark bg-surface px-3 py-2 text-sm outline-none focus:outline-none focus:ring-1 focus:ring-primary/30"
                    >
                      <option value="source-over">Normal</option>
                      <option value="multiply">Multiply</option>
                      <option value="screen">Screen</option>
                      <option value="overlay">Overlay</option>
                      <option value="darken">Darken</option>
                      <option value="lighten">Lighten</option>
                    </select>
                  </label>
                </div>
                <div className="border-t border-border dark:border-border-dark pt-4">
                  <h4 className="mb-3 text-base font-semibold">Mask</h4>
                  <select
                    value={one.mask || "none"}
                    onChange={(event) =>
                      onUpdateObjects((item) => ({
                        ...item,
                        mask: event.target.value,
                      }))
                    }
                    aria-label="Object mask"
                    className="w-full rounded-lg border border-border dark:border-border-dark text-foreground dark:text-foreground-dark bg-surface px-3 py-3 text-sm outline-none focus:outline-none focus:ring-1 focus:ring-primary/30"
                  >
                    <option value="none">None</option>
                    <option value="circle">Circle</option>
                    <option value="rounded">Rounded</option>
                    <option value="heart">Heart</option>
                    <option value="star">Star</option>
                  </select>
                </div>
                {(one.type === "shape" || one.type === "text") && (
                  <div className="border-t border-border dark:border-border-dark pt-4">
                    <h4 className="mb-3 text-base font-semibold">Style</h4>
                    <label className="flex items-center justify-between text-xs text-text-secondary">
                      Fill
                      <input
                        type="color"
                        value={one.color || "#3b5bff"}
                        onChange={(event) =>
                          onUpdateObjects((item) => ({
                            ...item,
                            color: event.target.value,
                          }))
                        }
                        aria-label="Fill color"
                        className="h-9 w-14 cursor-pointer rounded-lg border border-border dark:border-border-dark bg-transparent p-1"
                      />
                    </label>
                    <div className="mt-3 flex items-center justify-between gap-3 text-xs text-text-secondary">
                      <span>Stroke</span>
                      <input
                        type="color"
                        value={
                          one.type === "text"
                            ? one.textStroke || "#ffffff"
                            : one.stroke || "#ffffff"
                        }
                        onChange={(event) =>
                          onUpdateObjects((item) => ({
                            ...item,
                            ...(one.type === "text"
                              ? { textStroke: event.target.value }
                              : { stroke: event.target.value }),
                          }))
                        }
                        aria-label="Stroke color"
                        className="h-9 w-14 cursor-pointer rounded-lg border border-border dark:border-border-dark bg-transparent p-1"
                      />
                      <input
                        type="number"
                        min="0"
                        max="32"
                        value={
                          one.type === "text"
                            ? one.textStrokeWidth || 0
                            : one.strokeWidth || 0
                        }
                        onChange={(event) =>
                          onUpdateObjects((item) => ({
                            ...item,
                            ...(one.type === "text"
                              ? { textStrokeWidth: Number(event.target.value) }
                              : { strokeWidth: Number(event.target.value) }),
                          }))
                        }
                        aria-label="Stroke width"
                        className="w-20 rounded-lg border border-border dark:border-border-dark text-foreground dark:text-foreground-dark px-3 py-2 text-sm outline-none focus:outline-none focus:ring-1 focus:ring-primary/30"
                      />
                      <span>px</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {panel === "animate" && (
          <div className="space-y-4 p-4">
            <div className="text-base font-semibold">Animation</div>
            <label className="block text-xs">
              Duration
              <input
                type="range"
                min="500"
                max={MAX_ANIMATION_DURATION}
                value={project.duration}
                onChange={(event) =>
                  updateProject(
                    (current) => ({
                      ...current,
                      duration: Number(event.target.value),
                    }),
                    "duration",
                  )
                }
                className="w-full"
              />
            </label>
            <div className="grid grid-cols-2 gap-1">
              <select
                value={preset}
                onChange={(event) => onSetPreset(event.target.value)}
                className="rounded border border-border dark:border-border-dark text-foreground dark:text-foreground-dark p-2 text-xs outline-none focus:outline-none focus:ring-1 focus:ring-primary/30"
              >
                {PRESETS.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={onApplyAnimation}
                className="rounded border border-border dark:border-border-dark text-foreground dark:text-foreground-dark p-2 text-xs outline-none focus:outline-none focus:ring-1 focus:ring-primary/30"
              >
                Apply
              </button>
            </div>
            <button
              type="button"
              onClick={onAddKeyframe}
              disabled={!one}
              className="w-full rounded border border-border dark:border-border-dark text-foreground dark:text-foreground-dark p-2 text-xs disabled:opacity-40 outline-none focus:outline-none focus:ring-1 focus:ring-primary/30"
            >
              Add keyframe at {(time / 1000).toFixed(1)}s
            </button>
            {one && (
              <div className="space-y-2 border-t border-border dark:border-border-dark pt-3">
                <div className="text-xs font-semibold">
                  Layer timing · {one.name || one.type}
                </div>
                {/* The renderer skips a layer outside this span, so trimming here
                    is what the timeline bar and every export actually show. */}
                <SliderRow
                  label="Start"
                  min={0}
                  max={project.duration}
                  step={50}
                  value={Math.min(project.duration, one.startTime || 0)}
                  readout={`${((one.startTime || 0) / 1000).toFixed(1)}s`}
                  coalesceKey="startTime"
                  onChange={(value, coalesceKey) =>
                    onUpdateObjects(
                      (item) => ({
                        ...item,
                        startTime: Math.min(
                          value,
                          Number.isFinite(item.endTime)
                            ? item.endTime
                            : project.duration,
                        ),
                      }),
                      coalesceKey,
                    )
                  }
                />
                <SliderRow
                  label="End"
                  min={0}
                  max={project.duration}
                  step={50}
                  value={
                    Number.isFinite(one.endTime)
                      ? one.endTime
                      : project.duration
                  }
                  readout={
                    Number.isFinite(one.endTime)
                      ? `${(one.endTime / 1000).toFixed(1)}s`
                      : "end"
                  }
                  coalesceKey="endTime"
                  onChange={(value, coalesceKey) =>
                    onUpdateObjects(
                      (item) => ({
                        ...item,
                        endTime:
                          value >= project.duration
                            ? null
                            : Math.max(value, item.startTime || 0),
                      }),
                      coalesceKey,
                    )
                  }
                />
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={Boolean(one.animation?.enabled)}
                    onChange={(event) =>
                      onUpdateObjects((item) => ({
                        ...item,
                        animation: {
                          ...item.animation,
                          enabled: event.target.checked,
                        },
                      }))
                    }
                  />
                  Animate this layer
                </label>
                {one.animation?.enabled && (
                  <SliderRow
                    label="Loop"
                    min={250}
                    max={MAX_ANIMATION_DURATION}
                    step={50}
                    value={one.animation.duration || 2000}
                    readout={`${((one.animation.duration || 2000) / 1000).toFixed(1)}s`}
                    coalesceKey="animation-duration"
                    onChange={(value, coalesceKey) =>
                      onUpdateObjects(
                        (item) => ({
                          ...item,
                          animation: { ...item.animation, duration: value },
                        }),
                        coalesceKey,
                      )
                    }
                  />
                )}
              </div>
            )}
            {one?.animation?.keyframes?.map((frame, index) => (
              <div
                key={`${frame.time}-${index}`}
                className="flex justify-between rounded bg-surface p-1 text-[10px]"
              >
                {(frame.time / 1000).toFixed(1)}s
                <button
                  type="button"
                  className="outline-none focus:outline-none focus:ring-1 focus:ring-primary/30"
                  onClick={() =>
                    onUpdateObjects((item) => ({
                      ...item,
                      animation: {
                        ...item.animation,
                        keyframes: item.animation.keyframes.filter(
                          (_, i) => i !== index,
                        ),
                      },
                    }))
                  }
                  aria-label="Delete keyframe"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        {panel === "effects" && (
          <div className="space-y-4 p-4">
            <div className="text-base font-semibold">Effects</div>
            <EffectsControls
              outline={outline}
              shadow={shadow}
              onChange={updateProject}
            />
          </div>
        )}
      </aside>
    </>
  );
}
