import { motion, AnimatePresence } from "framer-motion";
import { Chip, ScrollArea } from "../ui";
import { useRef, useState, useEffect } from "react";

const intents = [
  {
    id: "all",
    label: "Live",
    color: "#3B5BFF",
  },
  {
    id: "unread",
    label: "Unread",
    color: "#DC2626",
  },
  {
    id: "task",
    label: "Tasks",
    color: "#16A34A",
  },
  {
    id: "question",
    label: "Questions",
    color: "#D97706",
  },
  { id: "idea", label: "Ideas", color: "#D97706" },
  {
    id: "important",
    label: "Important",
    color: "#DC2626",
  },
  {
    id: "reminder",
    label: "Reminders",
    color: "#D97706",
  },
  { id: "ai", label: "AI", color: "#3B5BFF" },
  {
    id: "memory",
    label: "Memory",
    color: "#6B7280",
  },
  {
    id: "pinned",
    label: "Pinned",
    color: "#3B5BFF",
  },
  {
    id: "mentions",
    label: "Mentions",
    color: "#D97706",
  },
];

export default function IntentFilterBar({
  activeIntent,
  onFilter,
  counts = {},
  expanded,
  onToggle,
}) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
  };

  useEffect(() => {
    checkScroll();
  }, [counts]);

  const scroll = (dir) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir * 200, behavior: "smooth" });
  };

  return (
    <nav
      className="flex-shrink-0 border-r border-border dark:border-border-dark bg-surface dark:bg-surface-dark backdrop-blur-glass flex flex-col"
      aria-label="Message intent filter"
    >
      <button
        onClick={onToggle}
        className="p-3 text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark hover:bg-hover/[0.07] dark:hover:bg-hover-dark/[0.07] transition-colors border-b border-border dark:border-border-dark focus:outline-none focus:ring-2 focus:ring-inset focus:ring-focus dark:focus:ring-focus-dark"
        aria-label={expanded ? "Collapse" : "Expand"}
        aria-expanded={expanded}
        type="button"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transform: expanded ? "rotate(0deg)" : "rotate(180deg)" }}
          className="transition-transform"
        >
          <path d="m18 15-6-6-6 6" />
        </svg>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            className="flex flex-col flex-1 overflow-hidden"
            initial={{}}
            animate={{}}
            exit={{}}
          >
            {intents.map((intent) => {
              const Icon = intent.icon;
              const count = counts[intent.id];
              return (
                <button
                  key={intent.id}
                  onClick={() => onFilter(intent.id)}
                  className={`relative flex flex-col items-center gap-1 px-2 py-3 text-[10px] transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-focus dark:focus:ring-focus-dark ${
                    activeIntent === intent.id
                      ? "text-white bg-primary dark:bg-primary-dark border-l-2 border-primary dark:border-primary-dark"
                      : "text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark hover:bg-surface/80 dark:bg-surface-dark/80"
                  }`}
                  aria-label={`Filter: ${intent.label}${count != null ? `, ${count}` : ""}`}
                  aria-pressed={activeIntent === intent.id}
                  type="button"
                >
                  <Icon
                    size={15}
                    style={
                      activeIntent === intent.id ? {} : { color: intent.color }
                    }
                  />
                  <span className="writing-mode-vertical text-[9px] font-medium">
                    {intent.label}
                  </span>
                  {count != null && count > 0 && (
                    <span
                      className="text-[9px] font-bold tabular-nums"
                      style={{
                        color:
                          activeIntent === intent.id ? "white" : intent.color,
                      }}
                    >
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

export function HorizontalIntentFilter({
  activeIntent,
  onFilter,
  counts = {},
}) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
  };

  useEffect(() => {
    checkScroll();
  }, [counts]);

  const scroll = (dir) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir * 200, behavior: "smooth" });
  };

  return (
    <div className="flex items-center gap-1 px-3 py-2 relative border-b border-border dark:border-border-dark bg-surface/80 dark:bg-surface-dark/80 backdrop-blur-glass">
      {canScrollLeft && (
        <button
          onClick={() => scroll(-1)}
          className="absolute left-0 z-10 w-6 h-full flex items-center justify-center bg-primary dark:bg-primary-dark"
        >
          <FiChevronLeft size={14} className="text-text-secondary dark:text-text-secondary-dark" />
        </button>
      )}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex min-w-0 gap-1 overflow-x-auto overflow-y-hidden scrollbar-hide"
      >
        {intents.map((intent) => {
          const Icon = intent.icon;
          const count = counts[intent.id];
          return (
            <Chip
              key={intent.id}
              active={activeIntent === intent.id}
              onClick={() => onFilter(intent.id)}
              size="sm"
            >
              {intent.label}
              {count != null && count > 0 && (
                <span className="ml-1 text-[10px] font-bold">{count}</span>
              )}
            </Chip>
          );
        })}
      </div>
    </div>
  );
}
