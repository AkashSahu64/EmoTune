import { useEffect, useRef, useState } from "react";
import {
  IoArrowBack, IoArrowForward, IoGridOutline, IoLayersOutline,
  IoPause, IoPlay, IoShapesOutline, IoStop, IoTrashOutline,
  IoDuplicateOutline,
} from "react-icons/io5";
import { FaArrowPointer, FaRegHand } from "react-icons/fa6";
import { STICKER_CANVAS_SIZE, STICKER_GRID_STEP } from "./stickerStudioEngine";

const TRACK_LABEL_PX = 112;
const TRACK_PAD_PX = 8;
const FPS_CHOICES = [12, 15, 24, 30, 60];
// The grid is painted as a share of the canvas box rather than in screen pixels,
// so a cell is always STICKER_GRID_STEP canvas units - the same step a drag
// snaps to at any zoom or window size.
const GRID_CELL_PERCENT = `${(STICKER_GRID_STEP / STICKER_CANVAS_SIZE) * 100}%`;

// The playhead overlays the whole footer, so it is measured from the padded
// container while the tracks it must line up with start after the label column.
const playheadLeft = (ratio) =>
  `calc(${TRACK_PAD_PX + TRACK_LABEL_PX}px + (100% - ${TRACK_PAD_PX * 2 + TRACK_LABEL_PX}px) * ${ratio})`;

// A tick per second while that stays readable, then every other second, so the
// ruler always describes the project's real duration instead of a fixed 0-5s.
function rulerTicks(duration) {
  const seconds = Math.max(1, Math.floor(duration / 1000));
  const step = seconds > 12 ? Math.ceil(seconds / 8) : 1;
  const ticks = [];
  for (let second = 0; second <= seconds; second += step) ticks.push(second);
  return ticks;
}

export default function StickerStudioWorkspace({
  canvasRef, project, time, selectedIds, selected, one, tool, onSetTool,
  canvasZoom, onSetCanvasZoom, pan, onSetPan, gridVisible, onSetGridVisible,
  guidesVisible, onSetGuidesVisible, onPointerDown, onPointerMove, onPointerUp,
  onDuplicate, onDelete, onGroup, onUngroup, onRestart, onPreviousFrame,
  playing, onTogglePlaying, onNextFrame, onSeek, onSetFps, onSelectIds, onExportAnimated,
  exporting, exportProgress, error, saved, cancelExportRef, recorderRef, drawingSize = 0,
}) {
  const duration = Math.max(1, project.duration);
  const offset = pan || { x: 0, y: 0 };
  const drawing = tool === "draw" || tool === "erase";
  const brushRing = useRef(null);
  const [fullscreen, setFullscreen] = useState(false);
  // The button has to say what the document is actually doing, including when
  // the user leaves fullscreen with Escape or F11 instead of the button.
  useEffect(() => {
    const sync = () => setFullscreen(Boolean(document.fullscreenElement));
    sync();
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  // The brush ring is moved through the DOM node instead of state: it follows
  // every pointer move, and re-rendering the studio that often would cost far
  // more than the ring is worth.
  const moveBrushRing = (event) => {
    const ring = brushRing.current;
    if (ring) {
      const rect = event.currentTarget.getBoundingClientRect();
      ring.style.left = `${((event.clientX - rect.left) / Math.max(1, rect.width)) * 100}%`;
      ring.style.top = `${((event.clientY - rect.top) / Math.max(1, rect.height)) * 100}%`;
      ring.style.visibility = "visible";
    }
    onPointerMove(event);
  };
  const hideBrushRing = () => {
    if (brushRing.current) brushRing.current.style.visibility = "hidden";
  };
  // Zoom to 100% and drop the pan together: a "fit" that left the canvas
  // dragged off-screen would not have fitted anything.
  const resetView = () => { onSetCanvasZoom(1); onSetPan?.({ x: 0, y: 0 }); };
  const cursor = tool === "pan" ? "cursor-grab active:cursor-grabbing" : drawing ? "cursor-none" : tool === "select" ? "cursor-default" : "cursor-crosshair";
  // Seeking works off the track area's own box, so it stays correct while the
  // timeline is scrolled sideways or the window is resized.
  const seekFromEvent = (event) => {
    const track = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - track.left) / Math.max(1, track.width);
    onSeek?.(Math.round(Math.min(1, Math.max(0, ratio)) * duration));
  };
  const seekByKey = (event) => {
    const frame = 1000 / (project.fps || 30);
    const steps = { ArrowLeft: -frame, ArrowRight: frame, Home: -time, End: duration - time };
    if (!(event.key in steps)) return;
    event.preventDefault();
    onSeek?.(Math.round(time + steps[event.key]));
  };
  return (
    <>
      <section className="order-2 flex min-h-[46vh] w-full min-w-0 flex-none flex-col items-center justify-start gap-5 overflow-auto bg-[#f7f8fb] p-5 md:col-start-3 md:row-start-2 md:min-h-0 md:w-auto dark:bg-background-dark">
        {selected.length > 1 && <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-surface px-3 py-2 text-xs shadow-sm dark:bg-surface-dark"><span className="font-medium text-text-secondary">{selected.length} objects selected</span></div>}
        <div className="flex items-center gap-1 rounded-2xl border border-border bg-background p-2 shadow-sm dark:border-border-dark dark:bg-background-dark">
          {/* Select is how drawing is put down without a "Done" button beside the
              pen, so it has to be a real, named control rather than a glyph. */}
          <button type="button" onClick={() => onSetTool("pan")} aria-pressed={tool === "pan"} aria-label="Pan canvas" className={`rounded-xl px-3 py-2 text-lg ${tool === "pan" ? "border border-primary bg-primary/10 text-primary" : "text-text-primary hover:bg-primary/10"}`} title="Pan canvas (or drag with the middle mouse button)"><FaRegHand aria-hidden="true" /></button>
          <button type="button" onClick={() => onSetTool("select")} aria-pressed={tool === "select"} aria-label="Select objects" className={`rounded-xl px-3 py-2 text-lg ${tool === "select" ? "border border-primary bg-primary/10 text-primary" : "text-text-primary hover:bg-primary/10"}`} title={drawing ? "Select objects (stops drawing)" : "Select objects"}><FaArrowPointer aria-hidden="true" /></button>
          <span className="mx-1 h-7 w-px bg-border" />
          <button type="button" onClick={() => onSetCanvasZoom((value) => Math.max(.25, Number((value - .25).toFixed(2))))} className="rounded-xl px-3 py-2 text-xl" title="Zoom out">−</button>
          <span className="min-w-16 rounded-xl border border-border px-3 py-2 text-center text-sm font-semibold">{Math.round(canvasZoom * 100)}%</span>
          <button type="button" onClick={() => onSetCanvasZoom((value) => Math.min(2, Number((value + .25).toFixed(2))))} className="rounded-xl px-3 py-2 text-xl" title="Zoom in">+</button>
          <button type="button" onClick={resetView} className="rounded-xl px-3 py-2 text-sm font-semibold" title="Fit canvas">Fit</button>
          <button type="button" onClick={() => onSetGridVisible((value) => !value)} aria-pressed={gridVisible} className={`rounded-xl px-3 py-2 text-xl ${gridVisible ? "bg-primary/10 text-primary" : ""}`} title="Toggle grid"><IoGridOutline /></button>
          <button type="button" onClick={() => onSetGuidesVisible((value) => !value)} aria-pressed={guidesVisible} className={`rounded-xl px-3 py-2 text-xl ${guidesVisible ? "bg-primary/10 text-primary" : ""}`} title="Toggle guides"><IoShapesOutline /></button>
          <button type="button" onClick={() => { resetView(); onSetGridVisible(false); onSetGuidesVisible(false); }} className="rounded-xl px-3 py-2 text-lg" title="Reset canvas view">◌</button>
          <button type="button" onClick={() => { if (document.fullscreenElement) document.exitFullscreen?.(); else document.documentElement.requestFullscreen?.(); }} aria-pressed={fullscreen} className={`rounded-xl px-3 py-2 text-lg ${fullscreen ? "bg-primary/10 text-primary" : ""}`} title={fullscreen ? "Leave fullscreen" : "Enter fullscreen"} aria-label={fullscreen ? "Leave fullscreen" : "Enter fullscreen"}>⛶</button>
        </div>
        {/* translate before scale, so a pan stays the number of screen pixels
            the pointer actually moved at any zoom level. */}
        <div className="relative aspect-square w-[min(90vw,900px)] max-w-full overflow-visible rounded-2xl border border-border bg-white shadow-sm md:w-[min(82vw,900px)]" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${canvasZoom})`, transformOrigin: "center" }}>
          {gridVisible && <div className="pointer-events-none absolute inset-0 z-10 opacity-30" style={{ backgroundImage: "linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)", backgroundSize: `${GRID_CELL_PERCENT} ${GRID_CELL_PERCENT}` }} />}
          {guidesVisible && <><div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-px bg-primary/50" /><div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-px bg-primary/50" /></>}
          {!project.objects.length && <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center px-8 text-center"><p className="text-base font-semibold">Create your sticker</p><p className="mt-1 max-w-xs text-xs text-text-secondary">Add an image, emoji, sticker, text, or shape to begin.</p></div>}
          <canvas ref={canvasRef} width={STICKER_CANVAS_SIZE} height={STICKER_CANVAS_SIZE} className={`h-full w-full touch-none ${cursor}`} onPointerDown={onPointerDown} onPointerMove={drawing ? moveBrushRing : onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onPointerLeave={hideBrushRing} onContextMenu={(event) => event.preventDefault()} />
          {/* The stroke lands where this ring sits and at this width, so the size
              is a share of the canvas box and stays true at any zoom. */}
          {drawing && drawingSize > 0 && <div ref={brushRing} aria-hidden="true" className={`pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-full ${tool === "erase" ? "border border-danger bg-danger/10" : "border border-black/70 bg-white/20"}`} style={{ width: `${(drawingSize / STICKER_CANVAS_SIZE) * 100}%`, aspectRatio: "1 / 1", left: "50%", top: "50%", visibility: "hidden" }} />}
          {selected.length > 0 && <div className="absolute left-1/2 top-full z-30 mt-5 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-border bg-background px-4 py-2 shadow-lg dark:border-border-dark dark:bg-background-dark">
            <button type="button" onClick={onDuplicate} aria-label="Duplicate selected" title="Duplicate" className="rounded-xl p-3 text-lg hover:bg-primary/10"><IoDuplicateOutline /></button>
            <button type="button" onClick={onDelete} aria-label="Delete selected" title="Delete" className="rounded-xl p-3 text-lg text-danger hover:bg-danger/10"><IoTrashOutline /></button>
            <button type="button" onClick={() => one?.type === "group" ? onUngroup() : onGroup()} disabled={one?.type === "group" ? false : selected.length < 2} aria-label={one?.type === "group" ? "Ungroup selected" : "Group selected"} title={one?.type === "group" ? "Ungroup" : "Group"} className="rounded-xl p-3 text-lg hover:bg-primary/10 disabled:opacity-40"><IoLayersOutline /></button>
          </div>}
        </div>
      </section>
      <footer className="order-4 sticky bottom-0 z-20 shrink-0 border-t border-border bg-background/95 p-3 backdrop-blur-sm dark:border-border-dark dark:bg-background-dark/95 md:col-start-2 md:col-span-2 md:row-start-3 md:row-end-4">
        <div className="flex min-h-9 items-center gap-3 border-b border-border pb-2 text-xs">
          <span className="mr-3 text-sm font-semibold">Timeline</span>
          <button type="button" onClick={onRestart} aria-label="Restart timeline" title="Restart timeline" className="rounded p-1 hover:bg-primary/10"><IoStop /></button>
          <button type="button" onClick={onPreviousFrame} aria-label="Previous frame" title="Previous frame" className="rounded p-1 hover:bg-primary/10"><IoArrowBack /></button>
          <button type="button" onClick={onTogglePlaying} aria-label={playing ? "Pause timeline" : "Play timeline"} title={playing ? "Pause" : "Play"} className="rounded p-1 hover:bg-primary/10">{playing ? <IoPause /> : <IoPlay />}</button>
          <button type="button" onClick={onNextFrame} aria-label="Next frame" title="Next frame" className="rounded p-1 hover:bg-primary/10"><IoArrowForward /></button>
          <span className="ml-auto whitespace-nowrap font-medium">{(time / 1000).toFixed(1)}s / {(duration / 1000).toFixed(1)}s</span>
          <label className="flex items-center gap-1 whitespace-nowrap font-medium" title="Export frame rate">
            <select value={project.fps} onChange={(event) => onSetFps?.(Number(event.target.value))} aria-label="Frames per second" className="rounded border border-border bg-surface px-1 py-1 font-semibold dark:border-border-dark dark:bg-surface-dark">
              {FPS_CHOICES.map((fps) => <option key={fps} value={fps}>{fps}</option>)}
            </select>
            fps
          </label>
        </div>
        <div className="mt-2 overflow-x-auto rounded-lg border border-border bg-surface/30">
          <div className="relative min-w-[620px] p-2">
            <div className="grid grid-cols-[112px_1fr] items-end border-b border-border pb-1 text-[9px] text-text-secondary">
              <span />
              <div
                role="slider"
                tabIndex={0}
                aria-label="Playhead"
                aria-valuemin={0}
                aria-valuemax={Math.round(duration)}
                aria-valuenow={Math.round(Math.min(time, duration))}
                aria-valuetext={`${(time / 1000).toFixed(1)} seconds`}
                onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); seekFromEvent(event); }}
                onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) seekFromEvent(event); }}
                onKeyDown={seekByKey}
                title="Drag to scrub"
                className="relative h-4 cursor-col-resize touch-none rounded-sm hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              >
                {rulerTicks(duration).map((second) => (
                  <span key={second} className="absolute -translate-x-1/2 tabular-nums" style={{ left: `${((second * 1000) / duration) * 100}%` }}>{second}s</span>
                ))}
              </div>
            </div>
            <div className="pointer-events-none absolute bottom-0 top-0 z-20 w-px bg-red-500" style={{ left: playheadLeft(Math.min(time, duration) / duration) }}><span className="absolute -left-3 -top-1 rounded bg-red-500 px-1 py-0.5 text-[8px] font-semibold text-white">{(time / 1000).toFixed(1)}s</span></div>
            <div className="max-h-56 overflow-y-auto md:max-h-64">
              {project.objects.length ? project.objects.map((item, index) => {
                const colors = ["bg-violet-400","bg-amber-400","bg-fuchsia-400","bg-orange-400","bg-blue-400","bg-red-400","bg-lime-400"];
                const keyframes = item.animation?.enabled ? item.animation.keyframes || [] : [];
                // The bar is the layer's real visible span and the diamonds are
                // its real keyframes: a layer with no animation shows none.
                const start = Math.min(duration, Math.max(0, item.startTime || 0));
                const end = Number.isFinite(item.endTime) ? Math.min(duration, item.endTime) : duration;
                const percent = (value) => `${Math.min(100, Math.max(0, (value / duration) * 100))}%`;
                return <button type="button" key={item.id} onClick={() => onSelectIds([item.id])} title={`${item.name || item.type} · ${(start / 1000).toFixed(1)}s-${(end / 1000).toFixed(1)}s`} className={`grid w-full grid-cols-[112px_1fr] items-center border-b border-border/70 text-left ${selectedIds.includes(item.id) ? "bg-primary/10" : "hover:bg-primary/5"}`}>
                  <span className="truncate px-1 py-2 text-[10px] font-medium">{item.name || item.type}</span>
                  <span className="relative h-8"><span className={`absolute inset-y-1 rounded-sm opacity-80 ${item.visible === false ? "bg-border" : colors[index % colors.length]}`} style={{ left: percent(start), width: `max(3px, ${percent(Math.max(0, end - start))})` }} />{keyframes.map((frame, frameIndex) => <span key={`${item.id}-${frameIndex}`} className="absolute top-1/2 z-10 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-white shadow-sm" style={{ left: percent(frame.time) }} />)}</span>
                </button>;
              }) : <span className="block px-2 py-4 text-xs text-text-secondary">Add objects to create timeline tracks</span>}
            </div>
          </div>
        </div>
        {saved && <p className="text-center text-xs text-success">{saved}</p>}{error && <p role="alert" className="text-center text-xs text-danger">{error}</p>}
        <div className="mt-2 flex flex-wrap justify-end gap-2"><button type="button" onClick={onExportAnimated} disabled={exporting || !project.objects.length} className="rounded-xl border px-3 py-2 text-xs disabled:opacity-40">Animated WebM</button>{exporting && <><span className="self-center text-xs text-text-secondary">Exporting {Math.round(exportProgress)}%</span><button type="button" onClick={() => { cancelExportRef.current = true; recorderRef.current?.stop(); }} className="rounded-xl border px-3 py-2 text-xs">Cancel</button></>}</div>
      </footer>
    </>
  );
}
