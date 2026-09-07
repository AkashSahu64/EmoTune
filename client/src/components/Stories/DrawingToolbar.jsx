import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IoChevronDown, IoTrashOutline } from "react-icons/io5";
import { FaEraser, FaHighlighter, FaMarker, FaPencil } from "react-icons/fa6";
import { BRUSH_PRESETS, drawSmoothPath } from "./stickerStudioEngine";

const BRUSH_ICONS = {
  pencil: FaPencil,
  marker: FaMarker,
  highlighter: FaHighlighter,
};
const BRUSH_SIZES = [4, 8, 14, 22, 32, 48];
const ERASER_SIZES = [8, 16, 26, 40, 60, 90];
const MAX_BRUSH_SIZE = 128;
const MAX_ERASER_SIZE = 160;
const DRAW_COLORS = [
  "#111827",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b5bff",
  "#8b5cf6",
  "#ec4899",
  "#ffffff",
];
// One place for the two-state look, so a tool, a size chip and a swatch all read
// as "selected" the same way instead of each inventing its own accent.
const ACTIVE = "border-primary bg-primary/10 text-primary";
const IDLE =
  "border-border dark:border-border-dark text-text-primary hover:bg-primary/5 dark:text-text-primary-dark";

function Popover({ anchorRef, open, onClose, label, children }) {
  const panelRef = useRef(null);
  const [box, setBox] = useState(null);
  useLayoutEffect(() => {
    if (!open) return undefined;
    const place = () => {
      const anchor = anchorRef.current?.getBoundingClientRect();
      if (!anchor) return;
      const panel = panelRef.current?.getBoundingClientRect();
      const width = panel?.width || 240;
      const height = panel?.height || 0;
      const margin = 8;
      const under = anchor.bottom + 6;
      // Flip above the trigger only when there is room there: a panel pinned to
      // the top edge is worse than one that hangs below the fold.
      const flip =
        under + height + margin > window.innerHeight &&
        anchor.top - height - 6 > margin;
      setBox({
        left: Math.max(
          margin,
          Math.min(anchor.left, window.innerWidth - width - margin),
        ),
        top: flip ? anchor.top - height - 6 : under,
      });
    };
    place();
    // Measured again next frame: the first pass runs before the panel has its
    // real height, which is what the flip decision needs.
    const frame = requestAnimationFrame(place);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchorRef]);
  // Escape is caught before the studio sees it, which would otherwise read it as
  // "close the editor" and take the whole project down with the popover.
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [open, onClose]);
  // Focus starts on the current choice, so Enter and the arrow keys work without
  // reaching for the pointer first.
  useEffect(() => {
    if (open)
      panelRef.current
        ?.querySelector(
          '[aria-checked="true"]:not([disabled]), button:not([disabled])',
        )
        ?.focus();
  }, [open]);
  const moveFocus = (event) => {
    // A slider inside the panel reads the arrow keys itself, so the menu only
    // steps between its own options.
    if (["INPUT", "SELECT", "TEXTAREA"].includes(event.target?.tagName)) return;
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[
      event.key
    ];
    if (!step) return;
    const items = [
      ...(panelRef.current?.querySelectorAll("button:not([disabled])") || []),
    ];
    if (!items.length) return;
    // Stopped as well as prevented: the studio moves the selected layer with the
    // arrow keys, and stepping through a menu must not drag a sticker with it.
    event.preventDefault();
    event.stopPropagation();
    const index = items.indexOf(document.activeElement);
    items[(index + step + items.length) % items.length].focus();
  };
  if (!open) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[9999]"
      onPointerDown={(event) => {
        // Pointer, not mouse: a tap has to close the popover on the spot, or the
        // synthesized click behind it would land on the canvas and start a stroke.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="menu"
        aria-label={label}
        onKeyDown={moveFocus}
        style={{
          left: box?.left ?? 0,
          top: box?.top ?? 0,
          visibility: box ? "visible" : "hidden",
        }}
        className="fixed max-w-[calc(100vw-1rem)] rounded-xl border border-border bg-background p-2 shadow-md dark:border-border-dark dark:bg-background-dark"
      >
        <p className="px-1 pb-1 text-sm font-semibold uppercase tracking-wide text-text-secondary dark:text-text-secondary-dark">
          {label}
        </p>
        {children}
      </div>
    </div>,
    document.body,
  );
}

function SettingRow({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="shrink-0 text-sm font-medium text-text-secondary dark:text-text-secondary-dark">
        {label}
      </span>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
        {children}
      </div>
    </div>
  );
}

export default function DrawingToolbar({
  tool,
  onSetTool,
  drawingState = {},
  onSetDrawingSetting,
  drawingCount = 0,
  onClearDrawing,
}) {
  const drawing = tool === "draw";
  const erasing = tool === "erase";
  const brush =
    BRUSH_PRESETS.find((entry) => entry.id === drawingState.brushType) ||
    BRUSH_PRESETS[0];
  const BrushIcon = BRUSH_ICONS[brush.id] || FaPencil;
  const color = drawingState.color || "#3b5bff";
  const size = erasing
    ? drawingState.eraserSize || 26
    : drawingState.brushSize || 5;
  const opacity = erasing
    ? (drawingState.eraserOpacity ?? 1)
    : (drawingState.opacity ?? 1);
  const maxSize = erasing ? MAX_ERASER_SIZE : MAX_BRUSH_SIZE;
  const set = (key, value) => onSetDrawingSetting?.(key, value);
  const [open, setOpen] = useState(null);
  const styleRef = useRef(null);
  const sizeRef = useRef(null);
  const colorRef = useRef(null);
  // Choosing from a popover closes it and hands focus back to the control that
  // opened it, so the keyboard never lands nowhere.
  const closeTo = (ref) => {
    setOpen(null);
    ref.current?.focus();
  };
  const toggle = (name) =>
    setOpen((current) => (current === name ? null : name));
  return (
    <div id="draw-tools" className="space-y-2 py-2">
      <div
        role="group"
        aria-label="Drawing tools"
        className="flex items-center gap-1 rounded-lg border border-border bg-background p-1 dark:border-border-dark dark:bg-background-dark"
      >
        {/* Split control: the face picks the pen, the chevron opens its styles. */}
        <div
          className={`flex min-w-0 items-center rounded-md border ${drawing ? ACTIVE : IDLE}`}
        >
          <button
            type="button"
            onClick={() => onSetTool("draw")}
            aria-pressed={drawing}
            aria-label={`Pen, ${brush.label}`}
            title={`Pen - ${brush.label}`}
            className="flex h-9 min-w-10 items-center gap-1.5 rounded-l-md px-2.5 text-sm font-semibold"
          >
            <BrushIcon aria-hidden="true" size={12} />
            <span className="max-w-[60px] truncate">{brush.label}</span>
          </button>
          <button
            type="button"
            ref={styleRef}
            onClick={() => {
              onSetTool("draw");
              toggle("style");
            }}
            aria-label="Pen styles"
            aria-haspopup="menu"
            aria-expanded={open === "style"}
            title="Pen styles"
            className="flex h-9 w-7 items-center justify-center rounded-r-md text-sm"
          >
            <IoChevronDown aria-hidden="true" size={14} />
          </button>
        </div>
        <button
          type="button"
          onClick={() => onSetTool("erase")}
          aria-pressed={erasing}
          aria-label="Eraser"
          title="Eraser"
          className={`flex h-10 w-11 shrink-0 items-center justify-center rounded-md border text-base ${erasing ? ACTIVE : IDLE}`}
        >
          <FaEraser aria-hidden="true" size={18} />
        </button>
      </div>
      {/* Settings stay secondary: a value with a compact trigger, not a grid of
          every option at once. Colour belongs to the pen, so it goes away with
          it, and size and opacity follow whichever tool is active. */}
      <div className="space-y-2 rounded-lg border border-border p-2 dark:border-border-dark">
        <SettingRow label="Size">
          <button
            type="button"
            ref={sizeRef}
            onClick={() => toggle("size")}
            aria-haspopup="menu"
            aria-expanded={open === "size"}
            aria-label={erasing ? "Eraser size" : "Brush size"}
            title={erasing ? "Eraser size" : "Brush size"}
            className="flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-semibold tabular-nums dark:border-border-dark"
          >
            {size} px
            <IoChevronDown aria-hidden="true" size={12} />
          </button>
        </SettingRow>
        {!erasing && (
          <SettingRow label="Color">
            <button
              type="button"
              ref={colorRef}
              onClick={() => toggle("color")}
              aria-haspopup="menu"
              aria-expanded={open === "color"}
              aria-label={`Drawing color ${color}`}
              title="Drawing color"
              className="flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs dark:border-border-dark"
            >
              <span
                aria-hidden="true"
                className="h-4 w-4 rounded-full border border-border dark:border-border-dark"
                style={{ backgroundColor: color }}
              />
              <IoChevronDown aria-hidden="true" size={12} />
            </button>
          </SettingRow>
        )}
        <SettingRow label="Opacity">
          {/* One slider for the active tool. The highlighter starts translucent,
              and this is the same value the stroke is drawn with. */}
          <input
            type="range"
            min="0.05"
            max="1"
            step="0.05"
            value={opacity}
            onChange={(event) =>
              set(
                erasing ? "eraserOpacity" : "opacity",
                Number(event.target.value),
              )
            }
            aria-label={erasing ? "Eraser opacity" : "Brush opacity"}
            title={erasing ? "Eraser opacity" : "Brush opacity"}
            className="min-w-0 flex-1 h-1.5 accent-primary [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:scale-75 [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:scale-75"
          />
          <span className="w-9 shrink-0 text-right text-xs tabular-nums text-text-secondary dark:text-secondary-dark">
            {Math.round(opacity * 100)}%
          </span>
        </SettingRow>
      </div>
      <button
        type="button"
        onClick={onClearDrawing}
        disabled={!drawingCount}
        aria-label={
          drawingCount
            ? `Clear all ${drawingCount} strokes`
            : "Clear drawing, nothing drawn yet"
        }
        title="Clear drawing"
        className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border text-sm font-semibold ${
          drawingCount
            ? "border-danger/40 text-danger hover:bg-danger/10"
            : "cursor-not-allowed border-dashed border-border text-text-secondary dark:border-border-dark dark:text-text-secondary-dark"
        }`}
      >
        <IoTrashOutline aria-hidden="true" size={15} />
        Clear drawing
        {drawingCount > 0 && (
          <span className="rounded-full bg-danger/10 px-1.5 text-[10px] tabular-nums">
            {drawingCount}
          </span>
        )}
      </button>
      <p className="px-1 text-[11px] leading-snug text-text-secondary dark:text-text-secondary-dark">
        Strokes are layers: one stroke is one undo step, and clearing can be
        undone with Ctrl+Z.
      </p>
      <Popover
        anchorRef={styleRef}
        open={open === "style"}
        onClose={() => closeTo(styleRef)}
        label="Pen styles"
      >
        {BRUSH_PRESETS.map((preset) => {
          const Icon = BRUSH_ICONS[preset.id] || FaPencil;
          const current = preset.id === brush.id;
          return (
            <button
              key={preset.id}
              type="button"
              role="menuitemradio"
              aria-checked={current}
              title={preset.label}
              onClick={() => {
                set("brushType", preset.id);
                set("brushSize", preset.size);
                set("opacity", preset.opacity);
                onSetTool("draw");
                closeTo(styleRef);
              }}
              className={`flex min-h-9 w-full items-center gap-2 rounded-lg px-2 ${current ? ACTIVE : "text-text-primary hover:bg-primary/5 dark:text-text-primary-dark"}`}
            >
              <Icon aria-hidden="true" size={12} />
              <span className="w-32 shrink-0 text-left text-sm font-semibold">
                {preset.label}
              </span>
            </button>
          );
        })}
      </Popover>
      <Popover
        anchorRef={sizeRef}
        open={open === "size"}
        onClose={() => closeTo(sizeRef)}
        label={erasing ? "Eraser size" : "Brush size"}
      >
        <div className="grid grid-cols-3 gap-1">
          {(erasing ? ERASER_SIZES : BRUSH_SIZES).map((value) => (
            <button
              key={value}
              type="button"
              role="menuitemradio"
              aria-checked={size === value}
              aria-label={`${value} pixels`}
              title={`${value} px`}
              onClick={() => {
                set(erasing ? "eraserSize" : "brushSize", value);
                closeTo(sizeRef);
              }}
              className={`flex h-11 flex-col items-center justify-center gap-1 rounded-lg border text-sm font-semibold tabular-nums ${size === value ? ACTIVE : IDLE}`}
            >
              <span
                aria-hidden="true"
                className="rounded-full bg-current"
                style={{
                  width: Math.min(14, Math.max(3, value / (erasing ? 6 : 3))),
                  height: Math.min(14, Math.max(3, value / (erasing ? 6 : 3))),
                }}
              />
              {value}
            </button>
          ))}
        </div>
        <label className="mt-1 flex items-center gap-2 px-1 text-xs text-text-secondary dark:text-text-secondary-dark">
          Fine
          <input
            type="range"
            min="1"
            max={maxSize}
            step="1"
            value={Math.min(size, maxSize)}
            onChange={(event) =>
              set(
                erasing ? "eraserSize" : "brushSize",
                Number(event.target.value),
              )
            }
            aria-label={erasing ? "Exact eraser size" : "Exact brush size"}
            title={
              erasing
                ? `Exact eraser size, 1 to ${maxSize} px`
                : `Exact brush size, 1 to ${maxSize} px`
            }
            className="min-w-0 flex-1 h-1.5 accent-primary [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:scale-75 [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:scale-75"
          />
          <span className="w-10 shrink-0 text-right tabular-nums text-text-secondary dark:text-text-secondary-dark">
            {size} px
          </span>
        </label>
      </Popover>
      <Popover
        anchorRef={colorRef}
        open={open === "color"}
        onClose={() => closeTo(colorRef)}
        label="Drawing color"
      >
        <div className="grid grid-cols-5 gap-1">
          {DRAW_COLORS.map((value) => (
            <button
              key={value}
              type="button"
              role="menuitemradio"
              aria-checked={color.toLowerCase() === value}
              aria-label={`Color ${value}`}
              title={value}
              onClick={() => {
                set("color", value);
                onSetTool("draw");
                closeTo(colorRef);
              }}
              className={`flex h-11 items-center justify-center rounded-lg border-2 ${color.toLowerCase() === value ? "border-primary bg-primary/10" : "border-transparent hover:bg-primary/5"}`}
            >
              <span
                aria-hidden="true"
                className="h-6 w-6 rounded-full border border-border dark:border-border-dark"
                style={{ backgroundColor: value }}
              />
            </button>
          ))}
        </div>
        <label className="mt-2 flex items-center justify-between gap-2 px-1 text-[10px] text-text-secondary dark:text-text-secondary-dark">
          Custom
          <input
            type="color"
            value={color}
            onChange={(event) => {
              set("color", event.target.value);
              onSetTool("draw");
            }}
            aria-label="Custom drawing color"
            title="Custom drawing color"
            className="h-8 w-16 rounded border border-border bg-transparent p-0.5 dark:border-border-dark"
          />
        </label>
      </Popover>
    </div>
  );
}
