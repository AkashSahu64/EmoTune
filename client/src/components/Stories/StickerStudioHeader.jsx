import {
  IoArrowBack,
  IoCheckmarkCircle,
  IoClose,
  IoCloudDownloadOutline,
  IoCloudUploadOutline,
  IoPlay,
  IoSaveOutline,
  IoSparklesOutline,
} from "react-icons/io5";
import { FaPlus } from "react-icons/fa6";
import { IoIosUndo, IoIosRedo } from "react-icons/io";
import { BiMessageSquareEdit } from "react-icons/bi";
import { RiErrorWarningLine } from "react-icons/ri";
import { MdMoreVert } from "react-icons/md";

export default function StickerStudioHeader({
  onClose,
  project,
  projectNameRef,
  dirty,
  history,
  future,
  onUndo,
  onRedo,
  onPreview,
  onSave,
  onCreateSticker,
  onRename,
  menuOpen,
  onToggleMenu,
  projectInputRef,
  onImportFile,
  onLoadSaved,
  onNewProject,
}) {
  return (
    <>
      <header className="relative flex max-h-[45px] shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-5 py-2 dark:border-border-dark dark:bg-background-dark md:col-span-4 md:row-start-1">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="Back"
            title="Back"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface transition hover:bg-primary/5 dark:border-border-dark dark:bg-surface-dark"
          >
            <IoArrowBack size={21} />
          </button>
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            <div className="leading-tight">
              <h2 className="text-xl font-bold tracking-tight">
                Sticker Studio
              </h2>
              <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
                Compose, animate and export
              </p>
            </div>
          </div>
          <div className="hidden h-10 w-[2px] bg-border md:block dark:bg-border-dark" />
          <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-surface px-2 py-1.5 dark:border-border-dark dark:bg-surface-dark">
            <input
              ref={projectNameRef}
              value={project.name || "Untitled Sticker"}
              onChange={(event) => onRename(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
              aria-label="Project name"
              className="w-32 bg-transparent text-sm font-semibold outline-none"
            />
            <button
              type="button"
              onClick={() => projectNameRef.current?.focus()}
              aria-label="Rename project"
              title="Rename project"
              className="rounded p-1 text-text-secondary hover:bg-primary/5 hover:text-primary dark:text-text-secondary-dark"
            >
              <BiMessageSquareEdit size={17} />
            </button>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            {dirty ? (
              <RiErrorWarningLine 
              className="h-6 w-6 text-warning"
                aria-label="Unsaved changes"
                title="Unsaved changes"
              />
            ) : (
              <IoCheckmarkCircle
                className="h-6 w-6 text-success"
                aria-label="Saved"
                title="Saved"
              />
            )}
            <div className="leading-tight">
              <p
                className={`text-sm font-medium ${dirty ? "text-warning" : "text-text-primary dark:text-text-primary-dark"}`}
              >
                {dirty ? "Unsaved" : "Saved"}
              </p>
              <p className="-mt-0.5 text-xs text-text-secondary dark:text-text-secondary-dark">
                {dirty ? "Changes not saved" : "All changes saved"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden items-center justify-center gap-4 sm:flex">
            <button
              type="button"
              onClick={onUndo}
              disabled={!history.length}
              aria-label="Undo"
              title="Undo"
              className="rounded-lg p-2 border border-border dark:border-border-dark bg-surface dark:bg-surface-dark text-surface-dark dark:text-surface hover:bg-primary/10 disabled:opacity-30 cursor-pointer"
            >
              <IoIosUndo size={18}/>
            </button>
            <button
              type="button"
              onClick={onRedo}
              disabled={!future.length}
              aria-label="Redo"
              title="Redo"
              className="rounded-lg p-2 border border-border dark:border-border-dark bg-surface dark:bg-surface-dark text-surface-dark dark:text-surface hover:bg-primary/10 disabled:opacity-30 cursor-pointer"
            >
              <IoIosRedo size={18}/>
            </button>
          </div>
          <button
            type="button"
            onClick={onPreview}
            aria-label="Preview sticker"
            title="Preview"
            className="hidden h-10 items-center rounded-lg border border-border bg-surface px-3 text-sm font-medium hover:bg-primary/5 md:inline-flex dark:border-border-dark dark:bg-surface-dark"
          >
            <IoPlay size={14} className="mr-2" />
            Preview
          </button>
          <button
            type="button"
            onClick={onSave}
            aria-label="Save project"
            title="Save project"
            className="hidden h-10 items-center rounded-lg border border-border bg-surface px-3 text-sm font-medium hover:bg-primary/5 md:inline-flex dark:border-border-dark dark:bg-surface-dark"
          >
            <IoSaveOutline size={14} className="mr-2" />
            Save
          </button>
          <button
            type="button"
            onClick={onCreateSticker}
            disabled={project.objects.length === 0}
            aria-label="Create sticker"
            title="Create Sticker"
            className="hidden h-10 items-center rounded-lg bg-gradient-to-r from-primary to-indigo-600 px-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 md:inline-flex"
          >
            <IoSparklesOutline size={14} className="mr-2" />
            Create Sticker
          </button>
          <button
            type="button"
            onClick={onToggleMenu}
            aria-label="More editor actions"
            title="More editor actions"
            className="rounded-full w-10 flex items-center justify-center h-10 p-1 border border-border dark:border-border-dark bg-surface dark:bg-surface-dark hover:bg-primary/10"
          >
            <MdMoreVert size={20}/>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            title="Close"
            className="rounded-xl border border-border bg-surface p-2 hover:bg-primary/5 md:hidden dark:border-border-dark dark:bg-surface-dark"
          >
            <IoClose size={20} />
          </button>
          {menuOpen && (
            <div className="absolute right-5 top-[48px] text-sm z-50 w-48 rounded-xl border border-border bg-background p-1.5 shadow-md dark:border-border-dark dark:bg-background-dark">
              <button
                type="button"
                onClick={onLoadSaved}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-primary/10"
              >
                <IoCloudDownloadOutline />
                Load project
              </button>
              <button
                type="button"
                onClick={() => {
                  projectInputRef.current?.click();
                  onToggleMenu();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-primary/10"
              >
                <IoCloudUploadOutline />
                Import project
              </button>
              <button
                type="button"
                onClick={onNewProject}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-primary/10"
              >
                <FaPlus />
                New project
              </button>
            </div>
          )}
        </div>
      </header>
      <input
        ref={projectInputRef}
        type="file"
        accept="application/json,.stickerproject.json"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (file) await onImportFile(file);
          event.target.value = "";
        }}
      />
    </>
  );
}
