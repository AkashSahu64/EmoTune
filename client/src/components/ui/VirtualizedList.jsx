import { useMemo, useState } from 'react';

/** Lightweight fixed-height virtual window for panels whose rows have a
 * predictable height. It keeps the scroll geometry intact while mounting only
 * the visible slice, avoiding a new dependency for the dashboard shell. */
export default function VirtualizedList({ items, itemHeight = 72, itemWidth = 72, overscan = 6, horizontal = false, renderItem, className = '' }) {
  const [scrollTop, setScrollTop] = useState(0);
  const viewportHeight = 560;
  const start = Math.max(0, Math.floor(scrollTop / (horizontal ? itemWidth : itemHeight)) - overscan);
  const end = Math.min(items.length, start + Math.ceil(viewportHeight / (horizontal ? itemWidth : itemHeight)) + overscan * 2);
  const visible = useMemo(() => items.slice(start, end), [items, start, end]);
  return (
    <div className={`${horizontal ? 'overflow-x-auto' : 'overflow-y-auto'} scrollbar-glass ${className}`} onScroll={(event) => setScrollTop(horizontal ? event.currentTarget.scrollLeft : event.currentTarget.scrollTop)}>
      <div className={horizontal ? 'flex gap-2' : ''} style={horizontal ? { paddingLeft: start * itemWidth, paddingRight: Math.max(0, items.length - end) * itemWidth } : { paddingTop: start * itemHeight, paddingBottom: Math.max(0, items.length - end) * itemHeight }}>
        {visible.map((item, index) => renderItem(item, start + index))}
      </div>
    </div>
  );
}
