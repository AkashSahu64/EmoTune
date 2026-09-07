import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { aiService } from "../../services/api";
import storyService from "../../services/storyService";
import { getStickerPreview } from "../MessageInput/MessageInput";
import {
  MAX_STICKER_OBJECTS,
  STICKER_CANVAS_SIZE,
  STICKER_GRID_STEP,
  animationPreset,
  createPngBlob,
  createDrawingObjectFromPoints,
  createStudioObject,
  createStudioProject,
  deserializeStickerProject,
  hitTestHandle,
  hitTestObject,
  makeStudioId,
  renderCompositionAtTime,
  renderSelectionToPng,
  serializeStickerProject,
  toObjectSpace,
  validatePngBlob,
} from "./stickerStudioEngine";
import {
  restoreProjectAssets,
  saveProjectWithAssets,
} from "./stickerStudioPersistence";
import { buildStickerSavePayload, countUnavailableLayers, fromServerEditorState } from "./stickerSaveService";
import stickerApi from "../../services/stickerService";
import {
  newClientMutationId,
  useCurrentUserId,
  useSaveSticker,
} from "../../hooks/useStickers";
import StickerStudioHeader from "./StickerStudioHeader";
import StickerStudioSidebar from "./StickerStudioSidebar";
import StickerStudioWorkspace from "./StickerStudioWorkspace";
import {
  StickerEditorProvider,
  useStickerEditor,
} from "./StickerEditorProvider";

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
// Undo depth, coalescing and the decoded-bitmap budget live with the state they
// bound, in StickerEditorProvider.
// Nudging the selection by keyboard is the only way to place a layer precisely
// without a mouse, so the canvas is not pointer-only.
const ARROW_NUDGE = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

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

/**
 * The Sticker Studio shell: one editor state provider wrapping one studio.
 *
 * Keeping the provider outside the studio is what lets the studio itself be a
 * consumer, so there is no second copy of the project to keep in step.
 */
export default function StickerMaker(props) {
  return (
    <StickerEditorProvider>
      <StickerStudio {...props} />
    </StickerEditorProvider>
  );
}

function StickerStudio({ onClose, onCreated, stickerId = null, onSavedToLibrary }) {
  const {
    project,
    projectRef,
    selectedIds,
    setSelectedIds,
    history,
    future,
    dirty,
    markSaved,
    recentImages,
    setRecentImages,
    imageCache,
    blobUrls,
    snapshot,
    commit,
    previewChange,
    endGesture,
    replaceProject,
    updateObjects,
    undo,
    redo,
  } = useStickerEditor();
  const canvasRef = useRef(null);
  const imageInputRef = useRef(null);
  const projectInputRef = useRef(null);
  const projectNameRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const interaction = useRef(null);
  const drawingFrame = useRef(0);
  const drawingDraft = useRef(null);
  const recorder = useRef(null);
  const cancelExport = useRef(false);
  const [tool, setTool] = useState("select");
  const [activeSidebarSection, setActiveSidebarSection] = useState("Image");
  const [panel, setPanel] = useState("layers");
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
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
  const [stockResults, setStockResults] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError, setStockError] = useState("");
  const stockSearchRef = useRef(null);
  const [canvasZoom, setCanvasZoom] = useState(1);
  // Where the canvas sits in the viewport, in screen pixels. View state, not
  // document state: panning is not something to undo.
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [gridVisible, setGridVisible] = useState(false);
  const [guidesVisible, setGuidesVisible] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [drawingState, setDrawingState] = useState({
    color: "#3b5bff",
    brushType: "pencil",
    brushSize: 5,
    opacity: 1,
    eraserSize: 26,
    eraserOpacity: 1,
  });
  const setDrawingSetting = useCallback((key, value) => {
    setDrawingState((current) => ({ ...current, [key]: value }));
  }, []);
  const [stickers, setStickers] = useState([]);
  const [stickerLoading, setStickerLoading] = useState(false);
  const [saved, setSaved] = useState("");
  // Server-side library save. libraryId present means "this project is already a
  // sticker", so the next save updates it instead of creating a second copy.
  const [libraryId, setLibraryId] = useState(stickerId);
  const [libraryProgress, setLibraryProgress] = useState(0);
  const currentUserId = useCurrentUserId();
  const saveSticker = useSaveSticker();
  const savingLibrary = saveSticker.isPending;
  const libraryInFlight = useRef(false);
  // One id per attempt, reused by a retry so a timed-out save cannot become two
  // stickers, and rotated once a save actually lands.
  const mutationId = useRef(newClientMutationId());
  const selected = useMemo(
    () => project.objects.filter((item) => selectedIds.includes(item.id)),
    [project.objects, selectedIds],
  );
  const one = selected[0];

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
      // Arrow keys move the selection, unless a control that reads them itself
      // has focus - the timeline scrubber is also driven by arrows.
      if (
        ARROW_NUDGE[event.key] &&
        selectedIds.length &&
        !event.target?.closest?.("[role='slider']")
      ) {
        event.preventDefault();
        const [dx, dy] = ARROW_NUDGE[event.key];
        const step = event.shiftKey ? 10 : 1;
        updateObjects(
          (item) => ({ ...item, x: item.x + dx * step, y: item.y + dy * step }),
          "nudge",
        );
      }
      if (!event.ctrlKey && !event.metaKey && !event.altKey) {
        if (event.key.toLowerCase() === "v") setTool("select");
        if (event.key.toLowerCase() === "h") setTool("pan");
      }
      if (event.key === "Escape") {
        // Escape peels one layer at a time, so leaving fullscreen or closing the
        // menu never throws away the project as a side effect.
        if (document.fullscreenElement) return;
        if (headerMenuOpen) {
          setHeaderMenuOpen(false);
          return;
        }
        onClose();
      }
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

  // Opening the studio straight onto an existing sticker: fetch that record's
  // project once so the editor starts where the caller asked, and so a save
  // updates it instead of creating a second copy.
  const requestedStickerLoaded = useRef(false);
  useEffect(() => {
    if (!stickerId || requestedStickerLoaded.current) return;
    requestedStickerLoaded.current = true;
    openLibrarySticker({ _id: stickerId });
  }, [stickerId]);

  // Stepping through history is owned by the editor provider, so the shortcuts
  // and the header buttons drive exactly the same undo stack.
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
    // A new layer is selected, so hand back the tool that can actually move it
    // instead of leaving the pointer stuck in pan, draw or erase.
    setTool("select");
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
  /**
   * Adds uploaded images, from either the file picker or a drop.
   *
   * Both entry points hand over the same list, so a dropped file goes through
   * exactly the same type and size checks as a picked one.
   */
  async function addImages(input) {
    const event = input?.target ? input : null;
    const files = [...(event ? event.target.files || [] : input || [])];
    if (event) event.target.value = "";
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
        blobUrls.current.delete(src);
        imageCache.current.delete(src);
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
    const strokes = project.objects.filter((item) => item.type === "drawing").length;
    if (!strokes) return;
    // Through commit(), so the whole clear is one undo step rather than a
    // silent deletion of every stroke.
    commit((current) => ({ ...current, objects: current.objects.filter((item) => item.type !== "drawing") }));
    toast.success(`Cleared ${strokes} stroke${strokes === 1 ? "" : "s"} - undo with Ctrl+Z`);
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
  /**
   * A handle has to stay the same size under the finger at every zoom level, so
   * the canvas-space tolerance is derived from the live display scale.
   */
  function handleTolerance() {
    const rect = canvasRef.current?.getBoundingClientRect();
    const scale = rect?.width ? rect.width / STICKER_CANVAS_SIZE : 1;
    return Math.max(10, 20 / scale);
  }
  function pointerDown(event) {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const p = point(event);
    // Middle-drag pans from any tool, the way every canvas editor behaves.
    if (tool === "pan" || event.button === 1) {
      event.preventDefault();
      interaction.current = {
        mode: "pan",
        pointerId: event.pointerId,
        origin: { x: event.clientX, y: event.clientY },
        pan,
      };
      return;
    }
    if (tool === "draw" || tool === "erase") {
      interaction.current = {
        mode: tool,
        start: snapshot(),
        pointerId: event.pointerId,
      };
      drawingDraft.current = {
        points: [[p.x, p.y]],
        color: tool === "erase" ? "#000000" : drawingState.color,
        size: tool === "erase" ? drawingState.eraserSize : drawingState.brushSize,
        opacity: tool === "erase" ? drawingState.eraserOpacity : drawingState.opacity,
        brushType: tool === "erase" ? "eraser" : drawingState.brushType,
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
    // The handles are matched where the renderer draws them, in the object's own
    // frame, so they stay grabbable however far the layer is rotated.
    const handle = ids.length === 1 ? hitTestHandle(p, item, handleTolerance()) : null;
    interaction.current = {
      mode: handle || "move",
      pointerId: event.pointerId,
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
    // Pan is measured in raw screen pixels: converting through the canvas box
    // would feed the pan back into its own coordinate system.
    if (active.mode === "pan") {
      setPan({
        x: active.pan.x + (event.clientX - active.origin.x),
        y: active.pan.y + (event.clientY - active.origin.y),
      });
      return;
    }
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
      // Resizing follows the object's own axes, so a rotated layer grows along
      // its width and height rather than along the screen's.
      const local = toObjectSpace(p, active.item);
      let width = Math.max(24, Math.round(Math.abs(local.x) * 2));
      let height = Math.max(24, Math.round(Math.abs(local.y) * 2));
      if (event.shiftKey) {
        const ratio = active.item.width / Math.max(1, active.item.height);
        if (width / Math.max(1, height) > ratio) height = Math.max(24, Math.round(width / ratio));
        else width = Math.max(24, Math.round(height * ratio));
      }
      previewChange((current) => ({
        ...current,
        objects: current.objects.map((item) =>
          item.id === active.item.id ? { ...item, width, height } : item,
        ),
      }));
      return;
    }
    if (active.mode === "rotate") {
      const raw =
        (Math.atan2(p.y - active.item.y, p.x - active.item.x) * 180) / Math.PI + 90;
      // Shift snaps to 15 degrees, which is how a straight or square-on angle
      // becomes reachable by hand.
      const angle = event.shiftKey ? Math.round(raw / 15) * 15 : Math.round(raw);
      previewChange((current) => ({
        ...current,
        objects: current.objects.map((item) =>
          item.id === active.item.id
            ? { ...item, rotation: ((angle % 360) + 360) % 360 }
            : item,
        ),
      }));
      return;
    }
    const dx = p.x - active.point.x;
    const dy = p.y - active.point.y;
    // Showing the grid is the request to align to it, so a drag lands on it.
    // Alt is the escape hatch for the one placement that has to sit off-grid.
    const snap = (value) =>
      gridVisible && !event.altKey
        ? Math.round(value / STICKER_GRID_STEP) * STICKER_GRID_STEP
        : value;
    previewChange((current) => ({
      ...current,
      objects: current.objects.map((item) => {
        const pos = active.positions.find((entry) => entry.id === item.id);
        return pos ? { ...item, x: snap(pos.x + dx), y: snap(pos.y + dy) } : item;
      }),
    }));
  }
  function pointerUp(event) {
    const active = interaction.current;
    if (!active) return;
    if (active.pointerId !== undefined && event?.pointerId !== undefined && event.pointerId !== active.pointerId) return;
    // Panning is view state, so it ends without touching the history stack.
    if (active.mode === "pan") {
      event?.currentTarget?.releasePointerCapture?.(active.pointerId);
      interaction.current = null;
      return;
    }
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
    endGesture(active.start);
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
  // Every image layer must be decoded before a render, or an export silently
  // drops the layers the canvas has not loaded yet.
  async function ensureImagesLoaded(target = project) {
    const sources = new Set();
    (target?.objects || []).forEach((item) => {
      if (item.type === "image" && item.src) sources.add(item.src);
      (item.children || []).forEach((child) => {
        if (child.type === "image" && child.src) sources.add(child.src);
      });
    });
    for (const src of sources) {
      try {
        await loadImage(src, imageCache.current);
      } catch {
        /* a missing layer is reported by the render, not by the preload */
      }
    }
  }
  async function exportPng() {
    setExporting(true);
    setError("");
    setExportProgress(10);
    try {
      await ensureImagesLoaded();
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
  // One MediaRecorder path, shared by "use this sticker now" and "save it to my
  // library", so an animated sticker is captured identically either way.
  function recordAnimatedWebm() {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      if (!canvas.captureStream || !window.MediaRecorder) {
        reject(new Error("Animated export is not supported by this browser"));
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
        reject(new Error("This browser cannot export animated stickers"));
        return;
      }
      setExporting(true);
      setExportProgress(0);
      cancelExport.current = false;
      try {
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
          cleanup();
          reject(new Error("Animated sticker export failed"));
        };
        media.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType });
          cleanup();
          if (cancelExport.current) {
            reject(Object.assign(new Error("Export cancelled"), { cancelled: true }));
            return;
          }
          if (!blob.size) {
            reject(new Error("Animated sticker export produced no data"));
            return;
          }
          resolve(
            new File([blob], `sticker-${Date.now()}.webm`, { type: mimeType }),
          );
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
        setExporting(false);
        recorder.current = null;
        reject(err instanceof Error ? err : new Error("Animated sticker export failed"));
      }
    });
  }
  async function exportAnimated() {
    setError("");
    try {
      await ensureImagesLoaded();
      onCreated?.(await recordAnimatedWebm());
    } catch (err) {
      if (!err?.cancelled) setError(err.message || "Animated sticker export failed");
    }
  }
  async function save() {
    try {
      localStorage.setItem(
        PROJECT_KEY,
        await saveProjectWithAssets(project, serializeStickerProject),
      );
      setSaved("Project saved");
      markSaved();
      setTimeout(() => setSaved(""), 2000);
    } catch {
      toast.error("Could not save project");
    }
  }
  /**
   * Saves the sticker into the signed-in user's library. MongoDB owns the
   * result; the local project in localStorage stays a separate, device-only copy.
   */
  async function saveToLibrary() {
    if (libraryInFlight.current) return;
    if (!currentUserId) {
      toast.error("Sign in to save stickers to your library");
      return;
    }
    if (!project.objects.length) {
      toast.error("Add something to the canvas before saving a sticker");
      return;
    }
    libraryInFlight.current = true;
    setError("");
    setLibraryProgress(0);
    try {
      await ensureImagesLoaded();
      // An animated project is stored as the WebM the recorder produces plus a
      // rendered still; saving only a PNG would drop the animation for good.
      const animated = project.objects.some(
        (item) =>
          item.animation?.enabled &&
          (item.animation.keyframes?.length || 0) > 1,
      );
      let assetFile = null;
      if (animated) {
        try {
          assetFile = await recordAnimatedWebm();
        } catch (err) {
          if (err?.cancelled) return;
          toast.warning("Animated capture failed - saving a still sticker instead");
        }
      }
      const payload = await buildStickerSavePayload({
        project,
        imageCache: imageCache.current,
        assetFile,
        time,
        clientMutationId: mutationId.current,
      });
      const data = await saveSticker.mutateAsync({
        stickerId: libraryId,
        payload,
        onProgress: setLibraryProgress,
      });
      mutationId.current = newClientMutationId();
      setSaved(libraryId ? "Sticker updated" : "Saved to My Stickers");
      setTimeout(() => setSaved(""), 2500);
      if (data?.sticker?._id) setLibraryId(String(data.sticker._id));
      (data?.warnings || []).forEach((warning) => toast.warning(warning));
      onSavedToLibrary?.(data?.sticker);
    } catch (err) {
      if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return;
      const message =
        err.response?.data?.error || err.message || "Could not save this sticker";
      setError(message);
      toast.error(message);
    } finally {
      libraryInFlight.current = false;
      setLibraryProgress(0);
    }
  }
  /**
   * Adds a sticker the user already saved onto the canvas as an image layer.
   *
   * The stored asset URL is server-owned, so the save path recognises it and
   * does not re-upload the same bytes. An animated sticker is a WebM, which a
   * canvas cannot draw, so its rendered still is used and the user is told.
   */
  async function addLibrarySticker(sticker) {
    const still = sticker?.assetType === "animated"
      ? sticker?.thumbnailUrl || sticker?.assetUrl
      : sticker?.assetUrl || sticker?.thumbnailUrl;
    if (!still) {
      toast.error("This sticker has no usable image");
      return;
    }
    try {
      const image = await loadImage(still, imageCache.current);
      const ratio = image.width / image.height;
      add({
        type: "image",
        src: still,
        originalSrc: still,
        width: ratio >= 1 ? 220 : 170,
        height: ratio >= 1 ? 170 : 220,
        name: sticker.title || "Saved sticker",
      });
      if (sticker.assetType === "animated")
        toast.info("Animated stickers are placed as a still frame");
    } catch {
      toast.error("This sticker could not be loaded");
    }
  }
  /**
   * Reopens a saved sticker's editor project.
   *
   * The studio stays pointed at the same record, so the next library save
   * updates that sticker instead of creating a copy. History is cleared because
   * the previous project's undo stack no longer describes what is on screen.
   */
  async function openLibrarySticker(sticker) {
    const id = sticker?._id ? String(sticker._id) : "";
    if (!id) return;
    try {
      const data = await stickerApi.get(id);
      const editorState = data?.sticker?.editorState;
      if (!data?.canEdit || !editorState?.objects?.length) {
        toast.error("This sticker has no editable project saved with it");
        return;
      }
      const restored = fromServerEditorState(editorState);
      await ensureImagesLoaded(restored);
      replaceProject(restored);
      setTime(0);
      setPlaying(false);
      markSaved();
      setLibraryId(id);
      mutationId.current = newClientMutationId();
      const missing = countUnavailableLayers(restored);
      if (missing)
        toast.warning(`${missing} image layer(s) could not be restored - replace them before saving`);
      setSaved(`Editing “${data.sticker.title || "sticker"}”`);
      setTimeout(() => setSaved(""), 2500);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || "Could not open this sticker");
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
      replaceProject(restored);
      markSaved();
      setSaved("Project loaded");
    } catch (error) {
      toast.error(error?.message || "Unable to load Sticker Studio project");
    }
  }

  function handleProjectChange(updater, options) {
    commit(updater, options);
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
    // Undoable rather than a hard reset: starting over by accident should be
    // recoverable with one Ctrl+Z.
    commit(() => createStudioProject());
    setSelectedIds([]);
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
  // Scrubbing the timeline stops playback, otherwise the animation loop would
  // fight the pointer and snap the playhead straight back.
  function handleSeek(next) {
    setPlaying(false);
    setTime(Math.min(project.duration, Math.max(0, next)));
  }
  function handleSetFps(fps) {
    commit((current) => ({ ...current, fps }));
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
          onSaveToLibrary={saveToLibrary}
          savingToLibrary={savingLibrary}
          libraryProgress={libraryProgress}
          libraryStickerId={libraryId}
          canSaveToLibrary={Boolean(currentUserId)}
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
            onUseSavedSticker={addLibrarySticker}
            onEditSavedSticker={openLibrarySticker}
            onUpdateObjects={updateObjects}
            onProjectChange={handleProjectChange}
            onRemoveBackground={removeBackground}
            backgroundRemoving={backgroundRemoving}
            backgroundError={backgroundError}
            drawingState={drawingState}
            onSetDrawingSetting={setDrawingSetting}
            drawingCount={project.objects.filter((item) => item.type === "drawing").length}
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
            pan={pan}
            onSetPan={setPan}
            gridVisible={gridVisible}
            onSetGridVisible={setGridVisible}
            guidesVisible={guidesVisible}
            onSetGuidesVisible={setGuidesVisible}
            onPointerDown={pointerDown}
            onPointerMove={pointerMove}
            onPointerUp={pointerUp}
            drawingSize={
              tool === "erase" ? drawingState.eraserSize : drawingState.brushSize
            }
            onDuplicate={duplicate}
            onDelete={removeSelected}
            onGroup={group}
            onUngroup={ungroup}
            onRestart={handleRestart}
            onPreviousFrame={handlePreviousFrame}
            playing={playing}
            onTogglePlaying={() => setPlaying((value) => !value)}
            onNextFrame={handleNextFrame}
            onSeek={handleSeek}
            onSetFps={handleSetFps}
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
