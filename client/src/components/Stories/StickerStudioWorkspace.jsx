import {
  IoArrowBack, IoArrowForward, IoGridOutline, IoLayersOutline,
  IoPause, IoPlay, IoShapesOutline, IoStop, IoTrashOutline,
  IoDuplicateOutline,
} from "react-icons/io5";
import { STICKER_CANVAS_SIZE } from "./stickerStudioEngine";

export default function StickerStudioWorkspace({
  canvasRef, project, time, selectedIds, selected, one, tool, onSetTool,
  canvasZoom, onSetCanvasZoom, gridVisible, onSetGridVisible,
  guidesVisible, onSetGuidesVisible, onPointerDown, onPointerMove, onPointerUp,
  onDuplicate, onDelete, onGroup, onUngroup, onRestart, onPreviousFrame,
  playing, onTogglePlaying, onNextFrame, onSelectIds, onExportAnimated,
  exporting, exportProgress, error, saved, cancelExportRef, recorderRef,
}) {
  return (
    <>
      <section className="order-2 flex min-h-[46vh] w-full min-w-0 flex-none flex-col items-center justify-start gap-5 overflow-auto bg-[#f7f8fb] p-5 md:col-start-3 md:row-start-2 md:min-h-0 md:w-auto dark:bg-background-dark">
        {selected.length > 1 && <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-surface px-3 py-2 text-xs shadow-sm dark:bg-surface-dark"><span className="font-medium text-text-secondary">{selected.length} objects selected</span></div>}
        <div className="flex items-center gap-1 rounded-2xl border border-border bg-background p-2 shadow-sm dark:border-border-dark dark:bg-background-dark">
          <button type="button" onClick={() => onSetTool("select")} className="rounded-xl px-3 py-2 text-lg text-text-primary hover:bg-primary/10" title="Pan canvas">✋</button>
          <button type="button" onClick={() => onSetTool("select")} className={`rounded-xl px-3 py-2 text-lg ${tool === "select" ? "border border-primary bg-primary/10 text-primary" : "text-text-primary hover:bg-primary/10"}`} title="Select objects">↖</button>
          <span className="mx-1 h-7 w-px bg-border" />
          <button type="button" onClick={() => onSetCanvasZoom((value) => Math.max(.25, Number((value - .25).toFixed(2))))} className="rounded-xl px-3 py-2 text-xl" title="Zoom out">−</button>
          <span className="min-w-16 rounded-xl border border-border px-3 py-2 text-center text-sm font-semibold">{Math.round(canvasZoom * 100)}%</span>
          <button type="button" onClick={() => onSetCanvasZoom((value) => Math.min(2, Number((value + .25).toFixed(2))))} className="rounded-xl px-3 py-2 text-xl" title="Zoom in">+</button>
          <button type="button" onClick={() => onSetCanvasZoom(1)} className="rounded-xl px-3 py-2 text-sm font-semibold" title="Fit canvas">Fit</button>
          <button type="button" onClick={() => onSetGridVisible((value) => !value)} className={`rounded-xl px-3 py-2 text-xl ${gridVisible ? "bg-primary/10 text-primary" : ""}`} title="Toggle grid"><IoGridOutline /></button>
          <button type="button" onClick={() => onSetGuidesVisible((value) => !value)} className={`rounded-xl px-3 py-2 text-xl ${guidesVisible ? "bg-primary/10 text-primary" : ""}`} title="Toggle guides"><IoShapesOutline /></button>
          <button type="button" onClick={() => { onSetCanvasZoom(1); onSetGridVisible(false); onSetGuidesVisible(false); }} className="rounded-xl px-3 py-2 text-lg" title="Reset canvas view">◌</button>
          <button type="button" onClick={() => document.documentElement.requestFullscreen?.()} className="rounded-xl px-3 py-2 text-lg" title="Fullscreen">⛶</button>
        </div>
        <div className="relative aspect-square w-[min(90vw,900px)] max-w-full overflow-visible rounded-2xl border border-border bg-white shadow-sm md:w-[min(82vw,900px)]" style={{ transform: `scale(${canvasZoom})`, transformOrigin: "center" }}>
          {gridVisible && <div className="pointer-events-none absolute inset-0 z-10 opacity-30" style={{ backgroundImage: "linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)", backgroundSize: "32px 32px" }} />}
          {guidesVisible && <><div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-px bg-primary/50" /><div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-px bg-primary/50" /></>}
          {!project.objects.length && <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center px-8 text-center"><p className="text-base font-semibold">Create your sticker</p><p className="mt-1 max-w-xs text-xs text-text-secondary">Add an image, emoji, sticker, text, or shape to begin.</p></div>}
          <canvas ref={canvasRef} width={STICKER_CANVAS_SIZE} height={STICKER_CANVAS_SIZE} className="h-full w-full touch-none" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} />
          {selected.length > 0 && <div className="absolute left-1/2 top-full z-30 mt-5 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-border bg-background px-4 py-2 shadow-lg dark:border-border-dark dark:bg-background-dark">
            <button type="button" onClick={onDuplicate} aria-label="Duplicate selected" title="Duplicate" className="rounded-xl p-3 text-lg hover:bg-primary/10"><IoDuplicateOutline /></button>
            <button type="button" onClick={onDelete} aria-label="Delete selected" title="Delete" className="rounded-xl p-3 text-lg text-danger hover:bg-danger/10"><IoTrashOutline /></button>
            <button type="button" onClick={() => one?.type === "group" ? onUngroup() : onGroup()} disabled={one?.type === "group" ? false : selected.length < 2} aria-label={one?.type === "group" ? "Ungroup selected" : "Group selected"} title={one?.type === "group" ? "Ungroup" : "Group"} className="rounded-xl p-3 text-lg hover:bg-primary/10 disabled:opacity-40"><IoLayersOutline /></button>
            <span className="px-2 text-xl text-text-secondary">•••</span>
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
          <span className="ml-auto whitespace-nowrap font-medium">{(time / 1000).toFixed(1)}s / {(project.duration / 1000).toFixed(1)}s</span>
          <label className="hidden items-center gap-1 md:flex" title="Timeline volume">🔊<input type="range" min="0" max="100" defaultValue="70" className="w-16 accent-primary" /></label>
          <span className="rounded border border-border px-2 py-1 font-semibold">{project.fps} fps</span><span className="text-base text-text-secondary" title="Timeline zoom">⌕</span>
        </div>
        <div className="mt-2 overflow-x-auto rounded-lg border border-border bg-surface/30">
          <div className="relative min-w-[620px] p-2">
            <div className="grid grid-cols-[112px_1fr] items-end border-b border-border pb-1 text-[9px] text-text-secondary"><span /><div className="flex justify-between px-1">{[0,1,2,3,4,5].map((second) => <span key={second}>{second}s</span>)}</div></div>
            <div className="pointer-events-none absolute bottom-0 top-0 z-20 w-px bg-red-500" style={{ left: `calc(${Math.min(time, project.duration) / Math.max(1, project.duration) * 100}% + 112px)` }}><span className="absolute -left-3 -top-1 rounded bg-red-500 px-1 py-0.5 text-[8px] font-semibold text-white">{(time / 1000).toFixed(1)}s</span></div>
            <div className="max-h-56 overflow-y-auto md:max-h-64">
              {project.objects.length ? project.objects.map((item, index) => {
                const colors = ["bg-violet-400","bg-amber-400","bg-fuchsia-400","bg-orange-400","bg-blue-400","bg-red-400","bg-lime-400"];
                const keyframes = item.animation?.keyframes || [];
                return <button type="button" key={item.id} onClick={() => onSelectIds([item.id])} className={`grid w-full grid-cols-[112px_1fr] items-center border-b border-border/70 text-left ${selectedIds.includes(item.id) ? "bg-primary/10" : "hover:bg-primary/5"}`}>
                  <span className="truncate px-1 py-2 text-[10px] font-medium">{item.name || item.type}</span>
                  <span className="relative h-8"><span className={`absolute inset-y-1 rounded-sm opacity-80 ${colors[index % colors.length]}`} style={{ left: `${(index % 4) * 10}%`, width: `${Math.max(38, 86 - (index % 4) * 12)}%` }} />{(keyframes.length ? keyframes : [{ time: 0 }, { time: item.animation?.duration || project.duration }]).map((frame, frameIndex) => <span key={`${item.id}-${frameIndex}`} className="absolute top-1/2 z-10 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-white shadow-sm" style={{ left: `${Math.min(100, Math.max(0, (frame.time / Math.max(1, item.animation?.duration || project.duration)) * 100))}%` }} />)}</span>
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
