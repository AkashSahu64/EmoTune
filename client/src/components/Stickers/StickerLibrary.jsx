import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  IoCreateOutline,
  IoHeart,
  IoHeartOutline,
  IoRefreshOutline,
  IoTrashOutline,
} from "react-icons/io5";
import {
  useCurrentUserId,
  useDeleteSticker,
  useMarkStickerUsed,
  useStickerLibrary,
  useToggleStickerFavorite,
} from "../../hooks/useStickers";

/**
 * "My Stickers" - the signed-in user's own saved stickers, straight from the
 * server.
 *
 * Deliberately separate from the AI sticker catalogue (`/api/ai/stickers`):
 * that is a shared read-only gallery, while everything here is owned by one
 * user and can be reused, reopened, favourited or deleted. MongoDB is the
 * source of truth; React Query only caches what it returns.
 *
 * The same component serves the studio sidebar, the story flow and the chat
 * picker - `onUse` decides what "pick this sticker" means in each place, and
 * `onEdit` is only offered where reopening a project makes sense.
 */
const SORT_TABS = [
  ["recent", "Recent"],
  ["used", "Most used"],
];
const TYPE_TABS = [
  ["", "All"],
  ["static", "Static"],
  ["animated", "Animated"],
];
const SKELETONS = ["a", "b", "c", "d", "e", "f"];
const SEARCH_DEBOUNCE_MS = 300;
// Written out rather than interpolated: Tailwind only emits classes it can see
// in the source, so `grid-cols-${columns}` would silently produce no columns.
const GRID_COLS = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
};

const previewOf = (sticker) => sticker?.thumbnailUrl || sticker?.assetUrl || "";

const TILE_ACTION = "flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background/90 text-text-secondary shadow-sm transition hover:text-primary disabled:opacity-40 dark:border-border-dark dark:bg-background-dark/90 dark:text-text-secondary-dark";

// The tile is one big "use this" button with the per-sticker actions layered on
// top as siblings - nesting them inside it would produce invalid markup and
// swallow their clicks.
function LibraryItem({
  sticker,
  onUse,
  onEdit,
  onToggleFavorite,
  confirming,
  onAskDelete,
  onConfirmDelete,
  onCancelDelete,
}) {
  const preview = previewOf(sticker);
  const title = sticker.title || "Untitled sticker";
  return (
    <div className="group relative aspect-square rounded-xl border border-border bg-surface shadow-sm transition hover:border-primary dark:border-border-dark dark:bg-surface-dark">
      <button
        type="button"
        onClick={() => onUse?.(sticker)}
        disabled={!onUse || confirming}
        title={title}
        aria-label={`Use ${title}`}
        className="flex h-full w-full items-center justify-center overflow-hidden rounded-xl p-2 disabled:cursor-default"
      >
        {preview ? (
          <img
            src={preview}
            alt={title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="text-[10px] text-text-secondary dark:text-text-secondary-dark">
            No preview
          </span>
        )}
      </button>
      {sticker.assetType === "animated" && (
        <span className="pointer-events-none absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[9px] font-bold uppercase tracking-wide text-white">
          Anim
        </span>
      )}
      <div className="absolute right-1 top-1 flex gap-1 opacity-100 transition md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
        <button
          type="button"
          onClick={() => onToggleFavorite?.(sticker)}
          aria-pressed={Boolean(sticker.isFavorite)}
          aria-label={sticker.isFavorite ? `Unfavourite ${title}` : `Favourite ${title}`}
          title={sticker.isFavorite ? "Remove from favourites" : "Add to favourites"}
          className={TILE_ACTION}
        >
          {sticker.isFavorite ? <IoHeart className="text-danger" /> : <IoHeartOutline />}
        </button>
        {onEdit && (
          <button
            type="button"
            onClick={() => onEdit(sticker)}
            aria-label={`Edit ${title}`}
            title="Edit in Sticker Studio"
            className={TILE_ACTION}
          >
            <IoCreateOutline />
          </button>
        )}
        <button
          type="button"
          onClick={() => onAskDelete(sticker._id)}
          aria-label={`Delete ${title}`}
          title="Delete sticker"
          className={TILE_ACTION}
        >
          <IoTrashOutline />
        </button>
      </div>
      {confirming && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 rounded-xl bg-background/95 p-1 text-center dark:bg-background-dark/95">
          <p className="px-1 text-[11px] font-semibold leading-tight">Delete this sticker?</p>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => onConfirmDelete(sticker._id)}
              className="rounded-md bg-danger px-2 py-1 text-[11px] font-semibold text-white"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={onCancelDelete}
              className="rounded-md border border-border px-2 py-1 text-[11px] font-semibold dark:border-border-dark"
            >
              Keep
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const CHIP = "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition";
const chipClass = (active) => `${CHIP} ${active
  ? "border-primary bg-primary/10 text-primary"
  : "border-border bg-surface text-text-secondary hover:border-primary/40 dark:border-border-dark dark:bg-surface-dark dark:text-text-secondary-dark"}`;

export default function StickerLibrary({
  onUse,
  onEdit,
  columns = 3,
  className = "",
  enabled = true,
  emptyAction = null,
}) {
  const userId = useCurrentUserId();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [favorite, setFavorite] = useState(false);
  const [assetType, setAssetType] = useState("");
  const [sort, setSort] = useState("recent");
  const [confirmId, setConfirmId] = useState(null);

  // Debounced so typing does not fire one request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim().slice(0, 200)), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const {
    stickers,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useStickerLibrary({ search, favorite, assetType, sort }, { enabled });

  const deleteSticker = useDeleteSticker();
  const toggleFavorite = useToggleStickerFavorite();
  const markUsed = useMarkStickerUsed();
  const narrowed = Boolean(search || favorite || assetType || sort !== "recent");
  const gridClass = `grid gap-2 ${GRID_COLS[columns] || GRID_COLS[3]}`;

  const handleUse = (sticker) => {
    onUse?.(sticker);
    // Best effort: this only feeds the "Most used" ordering, so a failure here
    // must not block the sticker the user already picked.
    markUsed.mutate(sticker._id);
  };

  const handleDelete = async (stickerId) => {
    setConfirmId(null);
    try {
      await deleteSticker.mutateAsync(stickerId);
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not delete this sticker");
    }
  };

  const handleFavorite = async (sticker) => {
    try {
      await toggleFavorite.mutateAsync({ stickerId: sticker._id, isFavorite: !sticker.isFavorite });
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not update this sticker");
    }
  };

  if (!userId) {
    return (
      <p className={`py-6 text-center text-xs text-text-secondary dark:text-text-secondary-dark ${className}`}>
        Sign in to see the stickers you have saved.
      </p>
    );
  }

  return (
    <div className={`flex min-h-0 flex-col gap-2 ${className}`}>
      <input
        value={searchInput}
        onChange={(event) => setSearchInput(event.target.value)}
        placeholder="Search my stickers..."
        aria-label="Search my stickers"
        maxLength={200}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/30 dark:border-border-dark dark:bg-background-dark"
      />
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        <button
          type="button"
          onClick={() => setFavorite((value) => !value)}
          aria-pressed={favorite}
          className={chipClass(favorite)}
        >
          Favourites
        </button>
        {TYPE_TABS.map(([value, label]) => (
          <button
            key={value || "all"}
            type="button"
            onClick={() => setAssetType(value)}
            aria-pressed={assetType === value}
            className={chipClass(assetType === value)}
          >
            {label}
          </button>
        ))}
        {SORT_TABS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setSort(value)}
            aria-pressed={sort === value}
            className={chipClass(sort === value)}
          >
            {label}
          </button>
        ))}
      </div>

      <div aria-live="polite" className="min-h-0">
        {isError ? (
          <div className="rounded-xl border border-border-error/40 bg-danger/5 p-3 text-center dark:border-border-error-dark/40">
            <p className="text-xs font-medium text-danger dark:text-danger-dark">
              {error?.response?.data?.error || error?.message || "Could not load your stickers"}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-2 inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:border-primary hover:text-primary dark:border-border-dark"
            >
              <IoRefreshOutline />
              Try again
            </button>
          </div>
        ) : isLoading ? (
          <div className={gridClass}>
            {SKELETONS.map((key) => (
              <div
                key={key}
                className="aspect-square animate-pulse rounded-xl border border-border bg-surface-muted/40 dark:border-border-dark dark:bg-surface-muted-dark/40"
              />
            ))}
          </div>
        ) : stickers.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
              {narrowed
                ? "No saved sticker matches these filters."
                : "You have not saved any stickers yet. Build one and choose “Save to library”."}
            </p>
            {narrowed ? (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setFavorite(false);
                  setAssetType("");
                  setSort("recent");
                }}
                className="mt-2 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:border-primary hover:text-primary dark:border-border-dark"
              >
                Clear filters
              </button>
            ) : (
              emptyAction
            )}
          </div>
        ) : (
          <>
            <div className={gridClass}>
              {stickers.map((sticker) => (
                <LibraryItem
                  key={sticker._id}
                  sticker={sticker}
                  onUse={onUse ? handleUse : null}
                  onEdit={onEdit}
                  onToggleFavorite={handleFavorite}
                  confirming={confirmId === sticker._id}
                  onAskDelete={setConfirmId}
                  onConfirmDelete={handleDelete}
                  onCancelDelete={() => setConfirmId(null)}
                />
              ))}
            </div>
            {hasNextPage && (
              <button
                type="button"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="mt-2 w-full rounded-lg border border-border py-2 text-xs font-semibold hover:border-primary hover:text-primary disabled:opacity-50 dark:border-border-dark"
              >
                {isFetchingNextPage ? "Loading..." : "Load more"}
              </button>
            )}
            <p className="mt-1.5 text-center text-[11px] text-text-secondary dark:text-text-secondary-dark">
              {stickers.length} sticker{stickers.length === 1 ? "" : "s"}
              {isFetching && !isFetchingNextPage ? " · refreshing" : ""}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
