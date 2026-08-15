import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  FiChevronLeft,
  FiChevronRight,
  FiDownload,
  FiMaximize,
  FiMinus,
  FiPlus,
  FiRotateCw,
  FiX,
} from "react-icons/fi";
import { getFileName, getMessageType } from "./utils/messageHelpers";

function MediaPreviewModal({ message, messages, onClose }) {
  const items = useMemo(
    () => (messages?.length ? messages : [message]).filter(Boolean),
    [message, messages],
  );
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      items.findIndex((item) => item._id === message?._id),
    ),
  );
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const dialogRef = useRef(null);
  const current = items[index] || message;
  const type = getMessageType(current);
  const src =
    type === "gif"
      ? current?.metadata?.gifUrl || current?.mediaUrl
      : current?.mediaUrl;
  const isImage = type === "image" || type === "gif" || type === "sticker";
  const canNavigate = items.length > 1;

  const resetTransform = useCallback(() => {
    setZoom(1);
    setRotation(0);
  }, []);
  const previous = useCallback(() => {
    setIndex((value) => (value - 1 + items.length) % items.length);
    resetTransform();
  }, [items.length, resetTransform]);
  const next = useCallback(() => {
    setIndex((value) => (value + 1) % items.length);
    resetTransform();
  }, [items.length, resetTransform]);
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) dialogRef.current?.requestFullscreen?.();
    else document.exitFullscreen?.();
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && canNavigate) previous();
      if (event.key === "ArrowRight" && canNavigate) next();
      if (isImage && (event.key === "+" || event.key === "="))
        setZoom((value) => Math.min(4, value + 0.25));
      if (isImage && event.key === "-")
        setZoom((value) => Math.max(0.5, value - 0.25));
      if (isImage && event.key.toLowerCase() === "r")
        setRotation((value) => (value + 90) % 360);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [canNavigate, isImage, next, onClose, previous]);

  const preview = (() => {
    if (isImage)
      return (
        <img
          className="max-h-[82vh] max-w-[92vw] object-contain transition-transform"
          src={src}
          alt="Media preview"
          draggable="false"
          style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
        />
      );
    if (type === "video")
      return (
        <video
          className="max-h-[82vh] max-w-[92vw]"
          src={src}
          controls
          autoPlay
          playsInline
          preload="metadata"
        />
      );
    if (type === "audio" || type === "voice")
      return (
        <audio
          className="w-[min(520px,90vw)]"
          src={src}
          controls
          autoPlay
          preload="metadata"
        />
      );
    if ((type === "file" || type === "document") && src)
      return (
        <iframe
          className="h-[82vh] w-[min(900px,92vw)] border-0"
          src={src}
          title={getFileName(current)}
        />
      );
    return <p className="text-sm text-text-secondary">Preview unavailable</p>;
  })();

  return (
    <motion.div
      className="fixed inset-0 z-modal flex flex-col bg-black/[.86] text-white"
      initial={{}}
      animate={{}}
      exit={{}}
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Media preview"
      ref={dialogRef}
      tabIndex="-1"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-white/[.15] px-4 py-3">
        <button type="button" onClick={onClose} aria-label="Close preview">
          <FiX />
        </button>
        <span className="min-w-0 flex-1 truncate px-3 text-sm font-medium">
          {type === "file" || type === "document"
            ? getFileName(current)
            : `${type.charAt(0).toUpperCase()}${type.slice(1)} preview`}
        </span>
        <div className="flex items-center gap-1">
          {isImage && (
            <>
              <button
                type="button"
                onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))}
                aria-label="Zoom out"
              >
                <FiMinus />
              </button>
              <span>{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                onClick={() => setZoom((value) => Math.min(4, value + 0.25))}
                aria-label="Zoom in"
              >
                <FiPlus />
              </button>
              <button
                type="button"
                onClick={() => setRotation((value) => (value + 90) % 360)}
                aria-label="Rotate"
              >
                <FiRotateCw />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label="Fullscreen"
          >
            <FiMaximize />
          </button>
          {src && (
            <a
              href={src}
              download={
                type === "file" || type === "document"
                  ? getFileName(current)
                  : undefined
              }
              aria-label="Download"
            >
              <FiDownload />
            </a>
          )}
        </div>
      </div>
      {canNavigate && (
        <button
          className="absolute left-3 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/[.45] text-white"
          type="button"
          onClick={previous}
          aria-label="Previous media"
        >
          <FiChevronLeft />
        </button>
      )}
      <div
        className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {preview}
      </div>
      {canNavigate && (
        <button
          className="absolute right-3 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/[.45] text-white"
          type="button"
          onClick={next}
          aria-label="Next media"
        >
          <FiChevronRight />
        </button>
      )}
      <div className="shrink-0 px-4 py-2 text-center text-[11px] text-white/[.65]">
        Esc to close{canNavigate ? " · Arrow keys to navigate" : ""}
        {isImage ? " · R to rotate" : ""}
      </div>
    </motion.div>
  );
}

export default memo(MediaPreviewModal);
