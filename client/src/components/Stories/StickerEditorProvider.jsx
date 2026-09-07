import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createStudioProject } from "./stickerStudioEngine";

// Undo depth, and how long two edits from the same control still count as one
// step. 600ms is longer than the gap between slider events but shorter than a
// deliberate second adjustment.
const HISTORY_LIMIT = 40;
const COALESCE_MS = 600;
// How many decoded bitmaps the editor keeps. Everything the current project
// draws is kept regardless; this only bounds the leftovers from browsing.
const IMAGE_CACHE_LIMIT = 60;

/**
 * A key naming the properties an edit changed, or null when it should not
 * coalesce.
 *
 * Numbers and strings come from continuous controls - sliders, colour pickers,
 * text fields - which fire repeatedly for one gesture. Booleans and objects
 * come from toggles and structural edits, which each deserve their own undo.
 */
function continuousChangeKey(before, after) {
  const keys = Object.keys(after).filter((key) => after[key] !== before[key]);
  if (!keys.length) return null;
  const continuous = keys.every(
    (key) => typeof after[key] === "number" || typeof after[key] === "string",
  );
  return continuous ? `objects:${keys.join(",")}` : null;
}

const StickerEditorContext = createContext(null);

/**
 * The editor state every studio panel reads and every edit goes through.
 *
 * Throws rather than falling back to a default, because a panel rendered
 * outside the provider would otherwise edit a project nobody is drawing.
 */
export function useStickerEditor() {
  const editor = useContext(StickerEditorContext);
  if (!editor)
    throw new Error("useStickerEditor must be used inside a StickerEditorProvider");
  return editor;
}

/**
 * The one place the sticker document lives.
 *
 * The project, the selection, the undo stacks and the decoded assets the canvas
 * draws are all owned here, so the studio has exactly one object model and
 * exactly one mutation path into it. View state - active tool, zoom, pan,
 * playhead - is deliberately kept out: it is not part of the sticker, and
 * undoing a pan is not something a user ever means.
 */
export function StickerEditorProvider({ children }) {
  const projectRef = useRef(null);
  const imageCache = useRef(new Map());
  const blobUrls = useRef(new Set());
  const lastCommit = useRef({ key: null, at: 0 });
  const [project, setProject] = useState(() => createStudioProject());
  const [selectedIds, setSelectedIds] = useState([]);
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [recentImages, setRecentImages] = useState([]);
  // Assigned during render, so a handler firing before the next render still
  // reads the project the user is looking at.
  projectRef.current = project;
  const snapshot = useCallback(() => JSON.stringify(projectRef.current), []);
  const pushHistory = useCallback((entry) => {
    setHistory((items) => [...items.slice(-(HISTORY_LIMIT - 1)), entry]);
    setFuture([]);
    setDirty(true);
  }, []);
  // Every project mutation lands here, so undo/redo always describes what the
  // user actually did. `coalesceKey` folds a burst of same-control edits - one
  // slider drag, one colour picker - into a single undo step instead of forty.
  const commit = useCallback(
    (updater, { coalesceKey = null } = {}) => {
      const now = Date.now();
      const merge =
        Boolean(coalesceKey) &&
        lastCommit.current.key === coalesceKey &&
        now - lastCommit.current.at < COALESCE_MS;
      lastCommit.current = { key: coalesceKey, at: now };
      if (merge) {
        setFuture([]);
        setDirty(true);
      } else {
        pushHistory(JSON.stringify(projectRef.current));
      }
      setProject((current) =>
        typeof updater === "function" ? updater(current) : updater,
      );
    },
    [pushHistory],
  );
  // Live feedback during a pointer gesture: the canvas has to follow the finger
  // on every move, but a drag is one undo step, closed by `endGesture` below.
  const previewChange = useCallback((updater) => {
    setProject((current) =>
      typeof updater === "function" ? updater(current) : updater,
    );
  }, []);
  const endGesture = useCallback(
    (startSnapshot) => {
      lastCommit.current = { key: null, at: 0 };
      if (startSnapshot && startSnapshot !== JSON.stringify(projectRef.current))
        pushHistory(startSnapshot);
    },
    [pushHistory],
  );
  /**
   * Releases blob URLs and decoded bitmaps the studio can no longer reach.
   *
   * A source the canvas still draws is never released: `renderContent` reads
   * straight from this cache, so evicting a live entry would blank the layer.
   * The recent-uploads strip counts as reachable too - its thumbnails are the
   * same blob URLs.
   */
  const releaseUnusedAssets = useCallback(
    (next) => {
      const keep = new Set();
      const walk = (objects) =>
        (objects || []).forEach((object) => {
          [object.src, object.originalSrc].forEach((src) => src && keep.add(src));
          walk(object.children);
        });
      walk(next?.objects);
      recentImages.forEach((asset) => asset.src && keep.add(asset.src));
      blobUrls.current = new Set(
        [...blobUrls.current].filter((url) => {
          if (keep.has(url)) return true;
          URL.revokeObjectURL(url);
          imageCache.current.delete(url);
          return false;
        }),
      );
      // Remote bitmaps are cheap to fetch again, so the cache is capped instead
      // of growing for the whole session. Map iteration is insertion-ordered,
      // so the oldest unreachable entries go first.
      const excess = imageCache.current.size - IMAGE_CACHE_LIMIT;
      if (excess > 0)
        [...imageCache.current.keys()]
          .filter((src) => !keep.has(src))
          .slice(0, excess)
          .forEach((src) => imageCache.current.delete(src));
    },
    [recentImages],
  );
  // Replaces the whole project (load, reopen, reset). The old undo stack
  // described a different composition, so keeping it would undo into a project
  // the user is no longer editing.
  const replaceProject = useCallback(
    (next) => {
      lastCommit.current = { key: null, at: 0 };
      // Clearing history is what makes this safe: no undo step can navigate back
      // to the outgoing objects, so their assets are provably unreachable.
      releaseUnusedAssets(next);
      setProject(next);
      setHistory([]);
      setFuture([]);
      setSelectedIds([]);
    },
    [releaseUnusedAssets],
  );
  /**
   * Applies an updater to every unlocked selected object as one undo step.
   *
   * The coalescing key is derived from what the updater actually changes, so
   * typing a layer name or dragging an opacity slider collapses into a single
   * step while a discrete toggle stays its own. The updater is called once on a
   * probe object for that diff, which is safe because every caller is a pure
   * spread over the object it receives.
   */
  const updateObjects = useCallback(
    (fn, coalesceKey) => {
      const editable = (item) => selectedIds.includes(item.id) && !item.locked;
      const probe = (projectRef.current?.objects || []).find(editable);
      commit(
        (current) => ({
          ...current,
          objects: current.objects.map((item) =>
            editable(item) ? fn(item) : item,
          ),
        }),
        {
          coalesceKey:
            coalesceKey ??
            (probe ? continuousChangeKey(probe, fn(probe)) : null),
        },
      );
    },
    [commit, selectedIds],
  );
  // Stepping through history starts a fresh coalescing window, otherwise the
  // next slider move would fold itself into the step just undone.
  const applyHistoryState = useCallback((serialized) => {
    lastCommit.current = { key: null, at: 0 };
    const restored = JSON.parse(serialized);
    setProject(restored);
    const ids = new Set((restored.objects || []).map((item) => item.id));
    setSelectedIds((current) => current.filter((id) => ids.has(id)));
    setDirty(true);
  }, []);
  const undo = useCallback(() => {
    const previous = history.at(-1);
    if (!previous) return;
    setHistory((items) => items.slice(0, -1));
    setFuture((items) => [snapshot(), ...items]);
    applyHistoryState(previous);
  }, [applyHistoryState, history, snapshot]);
  const redo = useCallback(() => {
    const next = future[0];
    if (!next) return;
    setFuture((items) => items.slice(1));
    setHistory((items) => [...items, snapshot()]);
    applyHistoryState(next);
  }, [applyHistoryState, future, snapshot]);
  // Saving does not change the document, so it only clears the dirty flag:
  // undo still walks back through exactly the same edits afterwards.
  const markSaved = useCallback(() => setDirty(false), []);
  // The last chance to release the blob URLs. The browser keeps them alive for
  // the lifetime of the document, and once the studio unmounts nothing else
  // holds a reference that could free them.
  useEffect(
    () => () => {
      blobUrls.current.forEach((url) => URL.revokeObjectURL(url));
      blobUrls.current.clear();
      imageCache.current.clear();
    },
    [],
  );
  // Rebuilt each render rather than memoised: the provider re-renders only when
  // the document itself changes, which re-renders the studio below it anyway,
  // and a missed dependency here would hand a panel a stale mutation function.
  const editor = {
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
  };
  return (
    <StickerEditorContext.Provider value={editor}>
      {children}
    </StickerEditorContext.Provider>
  );
}
