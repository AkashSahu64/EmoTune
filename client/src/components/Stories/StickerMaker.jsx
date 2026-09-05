import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { aiService } from "../../services/api";
import storyService from "../../services/storyService";
import { getStickerPreview } from "../MessageInput/MessageInput";
import {
  MAX_STICKER_OBJECTS,
  STICKER_CANVAS_SIZE,
  animationPreset,
  createPngBlob,
  createDrawingObjectFromPoints,
  createStudioObject,
  createStudioProject,
  deserializeStickerProject,
  hitTestObject,
  makeStudioId,
  renderCompositionAtTime,
  renderSelectionToPng,
  serializeStickerProject,
  validatePngBlob,
} from "./stickerStudioEngine";
import {
  restoreProjectAssets,
  saveProjectWithAssets,
} from "./stickerStudioPersistence";
import StickerStudioHeader from "./StickerStudioHeader";
import StickerStudioSidebar from "./StickerStudioSidebar";
import StickerStudioWorkspace from "./StickerStudioWorkspace";

const PROJECT_KEY = "emotune-sticker-studio-project-v1";
const EMOJIS = [
  "✨",
  "❤️",
  "🔥",
  "🎉",
  "😂",
  "🌈",
  "⭐",
  "🙌",
  "😍",
  "💯",
  "🥳",
  "🤑",
  "🤩",
  "🤕",
  "🤠",
  "🙊",
];
const PEN_STYLES = [
  { id: "pencil", label: "Pencil", size: 5, opacity: 1 },
  { id: "marker", label: "Marker", size: 12, opacity: 1 },
  { id: "highlighter", label: "Highlighter", size: 24, opacity: 0.45 },
];

function loadImage(src, cache) {
  if (cache.has(src)) return Promise.resolve(cache.get(src));
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (/^https?:\/\//i.test(src)) image.crossOrigin = "anonymous";
    image.onload = () => {
      cache.set(src, image);
      resolve(image);
    };
    image.onerror = () => reject(new Error("Image could not be loaded"));
    image.src = src;
  });
}
function bounds(item) {
  return {
    left: item.x - item.width / 2,
    right: item.x + item.width / 2,
    top: item.y - item.height / 2,
    bottom: item.y + item.height / 2,
  };
}

export default function StickerMaker({ onClose, onCreated }) {
  const canvasRef = useRef(null);
  const imageInputRef = useRef(null);
  const projectInputRef = useRef(null);
  const projectNameRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const imageCache = useRef(new Map());
  const blobUrls = useRef(new Set());
  const interaction = useRef(null);
  const projectRef = useRef(null);
  const drawingFrame = useRef(0);
  const drawingDraft = useRef(null);
  const recorder = useRef(null);
  const cancelExport = useRef(false);
  const [project, setProject] = useState(() => createStudioProject());
  const [selectedIds, setSelectedIds] = useState([]);
  const [tool, setTool] = useState("select");
  const [activeSidebarSection, setActiveSidebarSection] = useState("Image");
  const [panel, setPanel] = useState("layers");
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [error, setError] = useState("");
  const [backgroundError, setBackgroundError] = useState("");
  const [backgroundRemoving, setBackgroundRemoving] = useState(false);
  const [preset, setPreset] = useState("Pop In");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Trending");
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [emojiPickerPosition, setEmojiPickerPosition] = useState(null);
  const [recentEmojis] = useState(EMOJIS.slice(0, 14));
  const [recentImages, setRecentImages] = useState([]);
  const [stockResults, setStockResults] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError, setStockError] = useState("");
  const stockSearchRef = useRef(null);
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [gridVisible, setGridVisible] = useState(false);
  const [guidesVisible, setGuidesVisible] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [drawColor, setDrawColor] = useState("#3b5bff");
  const [penStyle, setPenStyle] = useState("pencil");
  const [drawSize, setDrawSize] = useState(5);
  const [drawOpacity, setDrawOpacity] = useState(1);
  const [eraserSize, setEraserSize] = useState(26);
  const [eraserOpacity, setEraserOpacity] = useState(1);
  const [stickers, setStickers] = useState([]);
  const [stickerLoading, setStickerLoading] = useState(false);
  const [saved, setSaved] = useState("");
  const [dirty, setDirty] = useState(false);
  const selected = useMemo(
    () => project.objects.filter((item) => selectedIds.includes(item.id)),
    [project.objects, selectedIds],
  );
  const one = selected[0];
  projectRef.current = project;
  const snapshot = useCallback(() => JSON.stringify(projectRef.current), []);
  const commit = useCallback(
    (updater) => {
      setHistory((items) => [...items.slice(-39), JSON.stringify(projectRef.current)]);
      setFuture([]);
      setDirty(true);
      setProject((current) =>
        typeof updater === "function" ? updater(current) : updater,
      );
    },
    [],
  );
  const updateObjects = (fn) =>
    commit((current) => ({
      ...current,
      objects: current.objects.map((item) =>
        selectedIds.includes(item.id) && !item.locked ? fn(item) : item,
      ),
    }));

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      if (canvas.width !== STICKER_CANVAS_SIZE * dpr || canvas.height !== STICKER_CANVAS_SIZE * dpr) {
        canvas.width = STICKER_CANVAS_SIZE * dpr;
        canvas.height = STICKER_CANVAS_SIZE * dpr;
      }
      const context = canvas.getContext("2d");
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      renderCompositionAtTime(context, project, time, {
        checkerboard: true,
        imageCache: imageCache.current,
        selectedIds,
      });
    }
  }, [project, selectedIds, time]);
  useEffect(() => {
    redraw();
  }, [redraw]);
  useEffect(() => {
    if (!playing) return undefined;
    const start = performance.now() - time;
    let id;
    const tick = (now) => {
      const next = now - start;
      if (next >= project.duration) {
        setTime(project.duration);
        setPlaying(false);
        return;
      }
      setTime(next);
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [playing, project.duration]);
  useEffect(
    () => () => blobUrls.current.forEach((url) => URL.revokeObjectURL(url)),
    [],
  );
  useEffect(() => () => {
    if (drawingFrame.current) cancelAnimationFrame(drawingFrame.current);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setStickerLoading(true);
      try {
        const response = await aiService.getStickers(
          { q: search.trim() || category, limit: 48 },
          { signal: controller.signal },
        );
        const payload = response.data?.data || response.data || {};
        setStickers(
          (payload.stickers || payload.sticker || []).filter((item) =>
            getStickerPreview(item),
          ),
        );
      } catch (err) {
        if (err.name !== "CanceledError" && err.code !== "ERR_CANCELED")
          setStickers([]);
      } finally {
        setStickerLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [category, search]);
  useEffect(() => {
    const handler = (event) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes(event.target?.tagName))
        return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        event.shiftKey ? redo() : undo();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicate();
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        removeSelected();
      }
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });
  useEffect(() => {
    if (!dirty) return undefined;
    const timer = setTimeout(() => {
      save().catch(() => {});
    }, 1200);
    return () => clearTimeout(timer);
  }, [dirty, project]);
  useEffect(() => {
    const dialog = document.querySelector(
      '[role="dialog"][aria-label="Sticker Studio"]',
    );
    if (!dialog) return;
    dialog.querySelectorAll("button").forEach((button) => {
      if (button.title) return;
      const label =
        button.getAttribute("aria-label") ||
        button.textContent?.replace(/\s+/g, " ").trim();
      if (label) button.title = label;
    });
  }, [panel, selectedIds, project.objects, exporting, playing]);

  function undo() {
    const previous = history.at(-1);
    if (!previous) return;
    setHistory((items) => items.slice(0, -1));
    setFuture((items) => [snapshot(), ...items]);
    setProject(JSON.parse(previous));
    setSelectedIds([]);
  }
  function redo() {
    const next = future[0];
    if (!next) return;
    setFuture((items) => items.slice(1));
    setHistory((items) => [...items, snapshot()]);
    setProject(JSON.parse(next));
    setSelectedIds([]);
  }
  function handlePreview() {
    setTime(0);
    setPlaying(true);
  }
  function handleRestart() {
    setTime(0);
    setPlaying(false);
  }
  function add(values) {
    if (project.objects.length >= MAX_STICKER_OBJECTS)
      return toast.error(`Maximum ${MAX_STICKER_OBJECTS} objects reached`);
    const item = createStudioObject(values.type || "shape", values);
    commit((current) => ({ ...current, objects: [...current.objects, item] }));
    setSelectedIds([item.id]);
    return item;
  }
  function openEmojiPicker() {
    if (emojiPickerOpen) {
      setEmojiPickerOpen(false);
      return;
    }
    const rect = emojiButtonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pickerWidth = Math.min(315, window.innerWidth - 16);
    setEmojiPickerPosition({
      left: Math.max(
        8,
        Math.min(rect.left, window.innerWidth - pickerWidth - 8),
      ),
      top: Math.max(8, rect.top - 448),
      width: pickerWidth,
    });
    setEmojiPickerOpen(true);
  }
  async function addImages(event) {
    const files = [...(event.target.files || [])];
    event.target.value = "";
    for (const file of files) {
      if (
        !/^image\/(png|jpeg|webp|gif)$/.test(file.type) ||
        file.size > 10 * 1024 * 1024
      ) {
        toast.error("Use PNG, JPG, WEBP or GIF under 10 MB");
        continue;
      }
      const src = URL.createObjectURL(file);
      blobUrls.current.add(src);
      try {
        const image = await loadImage(src, imageCache.current);
        const ratio = image.width / image.height;
        setRecentImages((items) => [
          { id: makeStudioId("asset"), src, name: file.name.slice(0, 24) },
          ...items.filter((item) => item.src !== src).slice(0, 11),
        ]);
        add({
          type: "image",
          src,
          originalSrc: src,
          file,
          width: ratio >= 1 ? 260 : 190,
          height: ratio >= 1 ? 190 : 260,
          name: file.name.slice(0, 24),
        });
      } catch {
        URL.revokeObjectURL(src);
        toast.error("Could not decode image");
      }
    }
  }
  async function addRecentImage(asset) {
    if (!asset?.src) return;
    try {
      const image = await loadImage(asset.src, imageCache.current);
      const ratio = image.width / image.height;
      add({
        type: "image",
        src: asset.src,
        originalSrc: asset.src,
        width: ratio >= 1 ? 260 : 190,
        height: ratio >= 1 ? 190 : 260,
        name: asset.name || "Recent image",
      });
    } catch {
      setRecentImages((items) => items.filter((item) => item.id !== asset.id));
      toast.error("This recent image is no longer available");
    }
  }
  async function addStockImage(asset) {
    if (!asset?.url) return;
    try {
      const image = await loadImage(asset.url, imageCache.current);
      const ratio = image.width / image.height;
      add({
        type: "image",
        src: asset.url,
        originalSrc: asset.url,
        width: ratio >= 1 ? 280 : 210,
        height: ratio >= 1 ? 210 : 280,
        name: asset.title || "Stock image",
        source: asset.source || "pexels",
        attribution: asset.photographer ? `Photo by ${asset.photographer}` : "",
      });
    } catch {
      toast.error("Stock image could not be loaded. Try another image.");
    }
  }
  async function searchStockImages(query = "nature") {
    const normalized = String(query || "nature").trim() || "nature";
    if (stockSearchRef.current) stockSearchRef.current.abort();
    const controller = new AbortController();
    stockSearchRef.current = controller;
    setStockLoading(true);
    setStockError("");
    try {
      const result = await storyService.searchStockImages(normalized, 1, controller.signal);
      if (!controller.signal.aborted) setStockResults(result.photos || []);
    } catch (error) {
      if (!controller.signal.aborted) {
        setStockResults([]);
        setStockError(error.response?.data?.error || error.message || "Stock images are unavailable");
      }
    } finally {
      if (!controller.signal.aborted) setStockLoading(false);
    }
  }
  async function addSticker(sticker) {
    const src = getStickerPreview(sticker);
    if (!src) return;
    try {
      await loadImage(src, imageCache.current);
      add({
        type: "image",
        src,
        width: 170,
        height: 170,
        name: sticker.title || "Sticker",
      });
    } catch {
      toast.error("Sticker could not be loaded");
    }
  }
  function removeSelected() {
    if (!selectedIds.length) {
      toast.info("Select a layer to delete");
      return;
    }
    commit((current) => ({
      ...current,
      objects: current.objects.filter((item) => !selectedIds.includes(item.id)),
    }));
    setSelectedIds([]);
  }
  function duplicate() {
    if (!selected.length) {
      toast.info("Select a layer to duplicate");
      return;
    }
    const copies = selected.map((item) => ({
      ...item,
      id: makeStudioId(item.type),
      name: `${item.name || item.type} copy`,
      x: item.x + 24,
      y: item.y + 24,
    }));
    commit((current) => ({
      ...current,
      objects: [...current.objects, ...copies],
    }));
    setSelectedIds(copies.map((item) => item.id));
  }
  function moveLayer(direction) {
    if (selectedIds.length !== 1) {
      toast.info("Select one layer to change its order");
      return;
    }
    const index = project.objects.findIndex(
      (item) => item.id === selectedIds[0],
    );
    const target =
      direction === "front"
        ? project.objects.length - 1
        : direction === "back"
          ? 0
          : index + direction;
    if (
      index < 0 ||
      target < 0 ||
      target >= project.objects.length ||
      target === index
    ) {
      toast.info("This layer is already at that position");
      return;
    }
    commit((current) => {
      const objects = [...current.objects];
      const [item] = objects.splice(index, 1);
      objects.splice(target, 0, item);
      return { ...current, objects };
    });
  }
  function toggleLayerLock(id) {
    commit((current) => ({
      ...current,
      objects: current.objects.map((item) =>
        item.id === id ? { ...item, locked: !item.locked } : item,
      ),
    }));
  }
  function handleClearDrawing() {
    const hasDrawing = project.objects.some((item) => item.type === "drawing");
    if (!hasDrawing) return;
    commit((current) => ({ ...current, objects: current.objects.filter((item) => item.type !== "drawing") }));
  }
  function group() {
    if (selected.length < 2) {
      toast.info("Select two or more layers to group");
      return;
    }
    const left = Math.min(...selected.map((item) => bounds(item).left));
    const right = Math.max(...selected.map((item) => bounds(item).right));
    const top = Math.min(...selected.map((item) => bounds(item).top));
    const bottom = Math.max(...selected.map((item) => bounds(item).bottom));
    const groupItem = createStudioObject("group", {
      name: "Sticker group",
      x: (left + right) / 2,
      y: (top + bottom) / 2,
      width: right - left,
      height: bottom - top,
      children: selected.map((item) => ({
        ...item,
        x: item.x - (left + right) / 2,
        y: item.y - (top + bottom) / 2,
      })),
    });
    commit((current) => ({
      ...current,
      objects: [
        ...current.objects.filter((item) => !selectedIds.includes(item.id)),
        groupItem,
      ],
    }));
    setSelectedIds([groupItem.id]);
  }
  async function createCompositeSticker() {
    if (selected.length < 2) {
      toast.info("Select two or more layers to create a composite sticker");
      return;
    }
    try {
      const result = await renderSelectionToPng(
        project,
        selectedIds,
        imageCache.current,
        time,
      );
      await validatePngBlob(result.blob, result.width, result.height);
      const file = new File(
        [result.blob],
        `composite-sticker-${Date.now()}.png`,
        { type: "image/png" },
      );
      const src = URL.createObjectURL(file);
      blobUrls.current.add(src);
      await loadImage(src, imageCache.current);
      const composite = createStudioObject("image", {
        name: "Composite sticker",
        src,
        originalSrc: src,
        file,
        x: result.x,
        y: result.y,
        width: result.width,
        height: result.height,
      });
      commit((current) => ({
        ...current,
        objects: [
          ...current.objects.filter((item) => !selectedIds.includes(item.id)),
          composite,
        ],
      }));
      setSelectedIds([composite.id]);
      toast.success("Composite sticker created");
    } catch (error) {
      toast.error(error?.message || "Could not create composite sticker");
    }
  }
  function ungroup() {
    if (!one || one.type !== "group") {
      toast.info("Select a group layer to ungroup");
      return;
    }
    const children = (one.children || []).map((item) => ({
      ...item,
      x: one.x + item.x,
      y: one.y + item.y,
    }));
    commit((current) => ({
      ...current,
      objects: [
        ...current.objects.filter((item) => item.id !== one.id),
        ...children,
      ],
    }));
    setSelectedIds(children.map((item) => item.id));
  }
  function align(kind) {
    if (selected.length < 2) {
      toast.info("Select at least two layers to align");
      return;
    }
    const left = Math.min(...selected.map((item) => bounds(item).left));
    const right = Math.max(...selected.map((item) => bounds(item).right));
    const top = Math.min(...selected.map((item) => bounds(item).top));
    const bottom = Math.max(...selected.map((item) => bounds(item).bottom));
    commit((current) => ({
      ...current,
      objects: current.objects.map((item) => {
        if (!selectedIds.includes(item.id)) return item;
        return {
          ...item,
          x:
            kind === "left"
              ? left + item.width / 2
              : kind === "centerX"
                ? (left + right) / 2
                : kind === "right"
                  ? right - item.width / 2
                  : item.x,
          y:
            kind === "top"
              ? top + item.height / 2
              : kind === "centerY"
                ? (top + bottom) / 2
                : kind === "bottom"
                  ? bottom - item.height / 2
                  : item.y,
        };
      }),
    }));
  }
  function distribute(axis) {
    if (selected.length < 3) {
      toast.info("Select at least three layers to distribute");
      return;
    }
    const sorted = [...selected].sort((a, b) => a[axis] - b[axis]);
    const gap = (sorted.at(-1)[axis] - sorted[0][axis]) / (sorted.length - 1);
    commit((current) => ({
      ...current,
      objects: current.objects.map((item) => {
        const index = sorted.findIndex((entry) => entry.id === item.id);
        return index > 0 && index < sorted.length - 1
          ? { ...item, [axis]: sorted[0][axis] + gap * index }
          : item;
      }),
    }));
  }
  function point(event) {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) * STICKER_CANVAS_SIZE) / rect.width,
      y: ((event.clientY - rect.top) * STICKER_CANVAS_SIZE) / rect.height,
    };
  }
  function redrawDrawingDraft() {
    if (!drawingDraft.current || !canvasRef.current) return;
    const context = canvasRef.current.getContext("2d");
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    renderCompositionAtTime(context, projectRef.current, time, {
      checkerboard: true,
      imageCache: imageCache.current,
      selectedIds,
      draftDrawing: drawingDraft.current,
    });
  }
  function scheduleDrawingDraft() {
    if (drawingFrame.current) return;
    drawingFrame.current = requestAnimationFrame(() => {
      drawingFrame.current = 0;
      redrawDrawingDraft();
    });
  }
  function hit(p) {
    return [...project.objects]
      .reverse()
      .find((item) => item.visible && hitTestObject(p, item));
  }
  function pointerDown(event) {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const p = point(event);
    if (tool === "draw" || tool === "erase") {
      interaction.current = {
        mode: tool,
        start: snapshot(),
        pointerId: event.pointerId,
      };
      drawingDraft.current = {
        points: [[p.x, p.y]],
        color: tool === "erase" ? "#000000" : drawColor,
        size: tool === "erase" ? eraserSize : drawSize,
        opacity: tool === "erase" ? eraserOpacity : drawOpacity,
        brushType: tool === "erase" ? "eraser" : penStyle,
        lineCap: "round",
        lineJoin: "round",
        erase: tool === "erase",
      };
      scheduleDrawingDraft();
      return;
    }
    const item = hit(p);
    if (!item) {
      setSelectedIds([]);
      return;
    }
    const ids = event.shiftKey
      ? selectedIds.includes(item.id)
        ? selectedIds.filter((id) => id !== item.id)
        : [...selectedIds, item.id]
      : [item.id];
    setSelectedIds(ids);
    if (item.locked) return;
    const handleResize =
      ids.length === 1 &&
      Math.abs(p.x - (item.x + item.width / 2)) < 18 &&
      Math.abs(p.y - (item.y + item.height / 2)) < 18;
    const handleRotate =
      ids.length === 1 &&
      Math.abs(p.x - item.x) < 18 &&
      Math.abs(p.y - (item.y - item.height / 2 - 14)) < 18;
    interaction.current = {
      mode: handleResize ? "resize" : handleRotate ? "rotate" : "move",
      start: snapshot(),
      point: p,
      item,
      ids,
      positions: ids.map((id) => {
        const entry = project.objects.find((object) => object.id === id);
        return { id, x: entry.x, y: entry.y };
      }),
    };
  }
  function pointerMove(event) {
    const active = interaction.current;
    if (!active) return;
    if (active.pointerId !== undefined && event.pointerId !== active.pointerId) return;
    const p = point(event);
    if (active.mode === "draw" || active.mode === "erase") {
      const points = drawingDraft.current?.points || [];
      const previous = points[points.length - 1];
      if (previous && Math.hypot(p.x - previous[0], p.y - previous[1]) < 1.5) return;
      drawingDraft.current = { ...drawingDraft.current, points: [...points, [p.x, p.y]] };
      scheduleDrawingDraft();
      return;
    }
    if (active.mode === "resize") {
      const width = Math.max(24, Math.abs(p.x - active.item.x) * 2);
      const height = Math.max(24, Math.abs(p.y - active.item.y) * 2);
      setProject((current) => ({
        ...current,
        objects: current.objects.map((item) =>
          item.id === active.item.id ? { ...item, width, height } : item,
        ),
      }));
      return;
    }
    if (active.mode === "rotate") {
      const angle =
        (Math.atan2(p.y - active.item.y, p.x - active.item.x) * 180) / Math.PI +
        90;
      setProject((current) => ({
        ...current,
        objects: current.objects.map((item) =>
          item.id === active.item.id
            ? { ...item, rotation: Math.round(angle) }
            : item,
        ),
      }));
      return;
    }
    const dx = p.x - active.point.x;
    const dy = p.y - active.point.y;
    setProject((current) => ({
      ...current,
      objects: current.objects.map((item) => {
        const pos = active.positions.find((entry) => entry.id === item.id);
        return pos ? { ...item, x: pos.x + dx, y: pos.y + dy } : item;
      }),
    }));
  }
  function pointerUp(event) {
    const active = interaction.current;
    if (!active) return;
    if (active.pointerId !== undefined && event?.pointerId !== undefined && event.pointerId !== active.pointerId) return;
    if (active.mode === "draw" || active.mode === "erase") {
      if (event?.type === "pointercancel") {
        drawingDraft.current = null;
        event.currentTarget?.releasePointerCapture?.(active.pointerId);
        interaction.current = null;
        return;
      }
      const draft = drawingDraft.current;
      const drawing = createDrawingObjectFromPoints(draft?.points, {
        name: draft?.erase ? "Eraser stroke" : "Drawing",
        color: draft?.color,
        size: draft?.size,
        opacity: draft?.opacity,
        brushType: draft?.brushType,
        lineCap: draft?.lineCap,
        lineJoin: draft?.lineJoin,
        erase: draft?.erase,
      });
      if (drawing) commit((current) => ({ ...current, objects: [...current.objects, drawing] }));
      drawingDraft.current = null;
      event?.currentTarget?.releasePointerCapture?.(active.pointerId);
      interaction.current = null;
      return;
    }
    const currentSnapshot = snapshot();
    if (active.start !== currentSnapshot) {
      const previousSnapshot = active.start;
      setHistory((items) => [...items.slice(-39), previousSnapshot]);
      setFuture([]);
      setDirty(true);
    }
    interaction.current = null;
  }
  async function removeBackground() {
    const item = selected.find((entry) => entry.type === "image");
    const file = item?.file;
    if (!item || !file) {
      setBackgroundError("Select an uploaded image first");
      return;
    }
    setBackgroundRemoving(true);
    setBackgroundError("");
    try {
      const blob = await storyService.removeBackground(file);
      const fileResult = new File([blob], `sticker-cutout-${Date.now()}.png`, {
        type: "image/png",
      });
      const src = URL.createObjectURL(fileResult);
      blobUrls.current.add(src);
      await loadImage(src, imageCache.current);
      commit((current) => ({
        ...current,
        objects: current.objects.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                src,
                file: fileResult,
                originalSrc: entry.originalSrc || entry.src,
                originalFile: entry.originalFile || entry.file,
                backgroundRemoved: true,
              }
            : entry,
        ),
      }));
    } catch (err) {
      setBackgroundError(err.message || "Background removal failed");
    } finally {
      setBackgroundRemoving(false);
    }
  }
  function restoreOriginal() {
    if (!one?.originalSrc) return;
    commit((current) => ({
      ...current,
      objects: current.objects.map((entry) =>
        entry.id === one.id
          ? {
              ...entry,
              src: entry.originalSrc,
              file: entry.originalFile || entry.file,
              backgroundRemoved: false,
            }
          : entry,
      ),
    }));
    setBackgroundError("");
  }
  function applyAnimation() {
    if (!selected.length) return;
    commit((current) => ({
      ...current,
      objects: current.objects.map((item) =>
        selectedIds.includes(item.id)
          ? {
              ...item,
              animation: animationPreset(preset, item, project.duration),
            }
          : item,
      ),
    }));
  }
  function addKeyframe() {
    if (!one) return;
    commit((current) => ({
      ...current,
      objects: current.objects.map((item) =>
        item.id === one.id
          ? {
              ...item,
              animation: {
                ...item.animation,
                enabled: true,
                duration: project.duration,
                keyframes: [
                  ...(item.animation?.keyframes || []),
                  {
                    time,
                    x: item.x,
                    y: item.y,
                    scale: item.scaleX,
                    rotation: item.rotation,
                    opacity: item.opacity,
                  },
                ].sort((a, b) => a.time - b.time),
              },
            }
          : item,
      ),
    }));
  }
  async function exportPng() {
    setExporting(true);
    setError("");
    setExportProgress(10);
    try {
      for (const item of project.objects)
        if (item.type === "image" && item.src)
          await loadImage(item.src, imageCache.current);
      const canvas = document.createElement("canvas");
      canvas.width = STICKER_CANVAS_SIZE;
      canvas.height = STICKER_CANVAS_SIZE;
      renderCompositionAtTime(canvas.getContext("2d"), project, time, {
        imageCache: imageCache.current,
      });
      const blob = await createPngBlob(canvas);
      await validatePngBlob(blob, STICKER_CANVAS_SIZE, STICKER_CANVAS_SIZE, {
        requireTransparency: project.canvas.background === "transparent",
      });
      setExportProgress(80);
      onCreated?.(
        new File([blob], `sticker-${Date.now()}.png`, { type: "image/png" }),
      );
      setExportProgress(100);
    } catch (err) {
      setError(err.message || "Could not create sticker");
    } finally {
      setExporting(false);
    }
  }
  function exportAnimated() {
    if (!canvasRef.current?.captureStream || !window.MediaRecorder) {
      setError("Animated export is not supported by this browser");
      return;
    }
    const mimeType = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
    ].find(
      (type) =>
        !MediaRecorder.isTypeSupported || MediaRecorder.isTypeSupported(type),
    );
    if (!mimeType) {
      setError("This browser cannot export animated stickers");
      return;
    }
    setExporting(true);
    setExportProgress(0);
    cancelExport.current = false;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = STICKER_CANVAS_SIZE;
      canvas.height = STICKER_CANVAS_SIZE;
      const stream = canvas.captureStream(project.fps);
      const chunks = [];
      const media = new MediaRecorder(stream, { mimeType });
      recorder.current = media;
      const cleanup = () => {
        stream.getTracks().forEach((track) => track.stop());
        recorder.current = null;
        setExporting(false);
      };
      media.ondataavailable = (event) =>
        event.data.size && chunks.push(event.data);
      media.onerror = () => {
        setError("Animated sticker export failed");
        cleanup();
      };
      media.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        if (!blob.size || cancelExport.current) {
          if (!cancelExport.current)
            setError("Animated sticker export produced no data");
          cleanup();
          return;
        }
        onCreated?.(
          new File([blob], `sticker-${Date.now()}.webm`, { type: mimeType }),
        );
        cleanup();
      };
      media.start(100);
      const started = performance.now();
      const frame = (now) => {
        if (cancelExport.current) {
          if (media.state !== "inactive") media.stop();
          return;
        }
        const elapsed = Math.min(project.duration, now - started);
        renderCompositionAtTime(canvas.getContext("2d"), project, elapsed, {
          imageCache: imageCache.current,
        });
        setExportProgress(Math.round((elapsed / project.duration) * 100));
        if (elapsed >= project.duration) media.stop();
        else requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    } catch (err) {
      setError(err.message || "Animated sticker export failed");
      setExporting(false);
      recorder.current = null;
    }
  }
  async function save() {
    try {
      localStorage.setItem(
        PROJECT_KEY,
        await saveProjectWithAssets(project, serializeStickerProject),
      );
      setSaved("Project saved");
      setDirty(false);
      setTimeout(() => setSaved(""), 2000);
    } catch {
      toast.error("Could not save project");
    }
  }
  async function load(value) {
    try {
      const restored = await restoreProjectAssets(
        deserializeStickerProject(value),
        (url) => {
          blobUrls.current.add(url);
          return url;
        },
      );
      setProject(restored);
      setSelectedIds([]);
      setDirty(false);
      setSaved("Project loaded");
    } catch (error) {
      toast.error(error?.message || "Unable to load Sticker Studio project");
    }
  }

  function handleProjectChange(updater) {
    setProject(updater);
  }
  function handleProjectNameChange(name) {
    commit((current) => ({ ...current, name: name.slice(0, 60) }));
  }
  async function handleImportFile(file) {
    try {
      await load(await file.text());
    } catch (error) {
      toast.error(error?.message || "Unable to import project");
    }
  }
  function handleLoadSaved() {
    const value = localStorage.getItem(PROJECT_KEY);
    if (value) load(value);
    else toast.error("No saved project found");
    setHeaderMenuOpen(false);
  }
  function handleNewProject() {
    setProject(createStudioProject());
    setSelectedIds([]);
    setDirty(true);
    setSaved("");
    setHeaderMenuOpen(false);
  }
  function handlePreviousFrame() {
    setTime(Math.max(0, time - 1000 / project.fps));
    setPlaying(false);
  }
  function handleNextFrame() {
    setTime(Math.min(project.duration, time + 1000 / project.fps));
    setPlaying(false);
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center bg-black/80 p-2 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Sticker Studio"
    >
      <div className="flex h-[calc(100vh-32px)] min-h-0 w-[calc(100vw-32px)] max-w-[1600px] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl dark:border-border-dark dark:bg-background-dark md:grid md:grid-cols-[132px_280px_minmax(0,1fr)_300px] md:grid-rows-[45px_minmax(0,1fr)_auto] lg:grid-cols-[132px_320px_minmax(0,1fr)_340px]">
        <StickerStudioHeader
          onClose={onClose}
          project={project}
          projectNameRef={projectNameRef}
          onRename={handleProjectNameChange}
          dirty={dirty}
          history={history}
          future={future}
          onUndo={undo}
          onRedo={redo}
          onPreview={handlePreview}
          onSave={save}
          onCreateSticker={exportPng}
          menuOpen={headerMenuOpen}
          onToggleMenu={() => setHeaderMenuOpen((value) => !value)}
          projectInputRef={projectInputRef}
          onImportFile={handleImportFile}
          onLoadSaved={handleLoadSaved}
          onNewProject={handleNewProject}
        />
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto md:contents">
          <StickerStudioSidebar
            project={project}
            selectedIds={selectedIds}
            selected={selected}
            one={one}
            tool={tool}
            activeSidebarSection={activeSidebarSection}
            onSetActiveSidebarSection={setActiveSidebarSection}
            panel={panel}
            onSetTool={setTool}
            onSetPanel={setPanel}
            onAdd={add}
            imageInputRef={imageInputRef}
            onAddImages={addImages}
            recentEmojis={recentEmojis}
            recentImages={recentImages}
            onAddRecentImage={addRecentImage}
            onRemoveRecentImage={(id) => setRecentImages((items) => items.filter((item) => item.id !== id))}
            stockResults={stockResults}
            stockLoading={stockLoading}
            stockError={stockError}
            onSearchStockImages={searchStockImages}
            onAddStockImage={addStockImage}
            emojiButtonRef={emojiButtonRef}
            emojiPickerOpen={emojiPickerOpen}
            emojiPickerPosition={emojiPickerPosition}
            onOpenEmojiPicker={openEmojiPicker}
            onCloseEmojiPicker={() => setEmojiPickerOpen(false)}
            search={search}
            onSetSearch={setSearch}
            category={category}
            onSetCategory={setCategory}
            stickers={stickers}
            stickerLoading={stickerLoading}
            onAddSticker={addSticker}
            onUpdateObjects={updateObjects}
            onProjectChange={handleProjectChange}
            onRemoveBackground={removeBackground}
            backgroundRemoving={backgroundRemoving}
            backgroundError={backgroundError}
            drawColor={drawColor}
            onSetDrawColor={setDrawColor}
            penStyle={penStyle}
            onSetPenStyle={setPenStyle}
            drawSize={drawSize}
            onSetDrawSize={setDrawSize}
            drawOpacity={drawOpacity}
            onSetDrawOpacity={setDrawOpacity}
            eraserSize={eraserSize}
            onSetEraserSize={setEraserSize}
            eraserOpacity={eraserOpacity}
            onSetEraserOpacity={setEraserOpacity}
            hasDrawing={project.objects.some((item) => item.type === "drawing")}
            onClearDrawing={handleClearDrawing}
            onMoveLayer={moveLayer}
            onToggleLayerLock={toggleLayerLock}
            onSelectIds={setSelectedIds}
            onAlign={align}
            onDistribute={distribute}
            onGroup={group}
            onUngroup={ungroup}
            onCreateCompositeSticker={createCompositeSticker}
            preset={preset}
            onSetPreset={setPreset}
            onApplyAnimation={applyAnimation}
            time={time}
            onAddKeyframe={addKeyframe}
          />
          <StickerStudioWorkspace
            canvasRef={canvasRef}
            project={project}
            time={time}
            selectedIds={selectedIds}
            selected={selected}
            one={one}
            tool={tool}
            onSetTool={setTool}
            canvasZoom={canvasZoom}
            onSetCanvasZoom={setCanvasZoom}
            gridVisible={gridVisible}
            onSetGridVisible={setGridVisible}
            guidesVisible={guidesVisible}
            onSetGuidesVisible={setGuidesVisible}
            onPointerDown={pointerDown}
            onPointerMove={pointerMove}
            onPointerUp={pointerUp}
            onDuplicate={duplicate}
            onDelete={removeSelected}
            onGroup={group}
            onUngroup={ungroup}
            onRestart={handleRestart}
            onPreviousFrame={handlePreviousFrame}
            playing={playing}
            onTogglePlaying={() => setPlaying((value) => !value)}
            onNextFrame={handleNextFrame}
            onSelectIds={setSelectedIds}
            onExportAnimated={exportAnimated}
            exporting={exporting}
            exportProgress={exportProgress}
            error={error}
            saved={saved}
            cancelExportRef={cancelExport}
            recorderRef={recorder}
          />
        </main>
      </div>
    </div>,
    document.body,
  );
}
