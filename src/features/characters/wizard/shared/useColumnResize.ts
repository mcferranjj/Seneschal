import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Manages resizable table columns.
 *
 * On mount, measures the rendered widths of each `<th>` from the DOM and
 * stores them so the table can switch to `table-layout: fixed` with a
 * `<colgroup>`. At the start of every drag, widths are re-read from the DOM
 * so the stored values are always accurate regardless of intervening layout
 * changes.
 *
 * Returns:
 *  - `tableRef`   — attach to the `<table>` element
 *  - `colWidths`  — current pixel widths (empty until first measurement)
 *  - `startResize(e, colIndex)` — call from the resize handle's `onPointerDown`
 */
export function useColumnResize(colCount: number) {
  const tableRef    = useRef<HTMLTableElement>(null);
  const [colWidths, setColWidths] = useState<number[]>([]);

  // Stable refs for the active window listeners so we can always remove them.
  const resizeMoveRef = useRef<((e: PointerEvent) => void) | null>(null);
  const resizeUpRef   = useRef<((e: PointerEvent) => void) | null>(null);
  const resizingRef   = useRef<{
    colIndex: number;
    startX: number;
    startWidth: number;
    neighbourStartWidth: number;
  } | null>(null);

  // Snapshot initial column widths from the DOM after first paint so the
  // table can switch from auto to fixed layout cleanly.
  useLayoutEffect(() => {
    if (!tableRef.current) return;
    const ths = Array.from(
      tableRef.current.querySelectorAll<HTMLTableCellElement>('thead th'),
    );
    if (ths.length === 0) return;
    const measured   = ths.map(th => th.getBoundingClientRect().width);
    const tableWidth = tableRef.current.getBoundingClientRect().width;
    const sumExceptLast = measured.slice(0, -1).reduce((a, b) => a + b, 0);
    measured[measured.length - 1] = tableWidth - sumExceptLast;
    setColWidths(measured);
  // colCount is the only external dep that would require a re-measure.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colCount]);

  function cleanupResizeListeners() {
    if (resizeMoveRef.current) {
      window.removeEventListener('pointermove', resizeMoveRef.current);
      resizeMoveRef.current = null;
    }
    if (resizeUpRef.current) {
      window.removeEventListener('pointerup',     resizeUpRef.current);
      window.removeEventListener('pointercancel', resizeUpRef.current);
      resizeUpRef.current = null;
    }
    resizingRef.current = null;
  }

  // Clean up any dangling listeners on unmount.
  useEffect(() => () => cleanupResizeListeners(), []);

  function startResize(e: React.PointerEvent, colIndex: number) {
    e.preventDefault();
    e.stopPropagation();

    cleanupResizeListeners();

    // Always re-read from the DOM at drag-start so widths are accurate
    // regardless of any layout changes since the last measurement.
    const ths = tableRef.current
      ? Array.from(tableRef.current.querySelectorAll<HTMLTableCellElement>('thead th'))
      : [];
    const liveWidths = ths.map(th => th.getBoundingClientRect().width);
    setColWidths(liveWidths);

    const startWidth          = liveWidths[colIndex]     ?? 0;
    const neighbourStartWidth = liveWidths[colIndex + 1] ?? 0;
    const startX = e.clientX;

    resizingRef.current = { colIndex, startX, startWidth, neighbourStartWidth };

    const onMove = (ev: PointerEvent) => {
      const r = resizingRef.current;
      if (!r) return;
      const rawDelta = ev.clientX - r.startX;
      const clampedDelta = Math.max(
        40 - r.startWidth,
        Math.min(rawDelta, r.neighbourStartWidth - 40),
      );
      setColWidths(prev => {
        const next    = [...prev];
        next[r.colIndex] = r.startWidth + clampedDelta;
        const nextIdx = r.colIndex + 1;
        if (nextIdx < next.length) {
          next[nextIdx] = r.neighbourStartWidth - clampedDelta;
        }
        return next;
      });
    };

    const onUp = () => cleanupResizeListeners();

    resizeMoveRef.current = onMove;
    resizeUpRef.current   = onUp;

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup',     onUp);
    window.addEventListener('pointercancel', onUp);
  }

  return { tableRef, colWidths, startResize };
}
