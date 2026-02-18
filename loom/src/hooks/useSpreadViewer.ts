import { type RefObject, useCallback, useEffect, useState } from "react";

export interface FlipState {
  id: number;
  direction: "forward" | "backward";
  fromSpread: number;
  targetSpread: number;
  done: boolean;
  staggerDelay: number;
}

// Zoom constants
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;
const WHEEL_ZOOM_STEP = 0.1;

const MAX_FLIPS = 8;
const STAGGER_MS = 150;

interface SpreadNav {
  currentSpread: number;
  flips: FlipState[];
  nextFlipId: number;
}

interface UseSpreadViewerOptions {
  totalSpreads: number;
  pageWidth: number;
  pageHeight: number;
  containerRef: RefObject<HTMLDivElement | null>;
  resetKey?: string | number;
}

/** Create flip chain from current latest position to `value`. */
function computeFlipsTo(
  prev: SpreadNav,
  value: number,
  totalSpreads: number,
): SpreadNav {
  // Use only active (non-done) flips for computation
  const activeFlips = prev.flips.filter((f) => !f.done);

  const latest =
    activeFlips.length > 0
      ? activeFlips[activeFlips.length - 1].targetSpread
      : prev.currentSpread;
  if (value === latest || value < 0 || value >= totalSpreads) return prev;

  const direction: "forward" | "backward" =
    value > latest ? "forward" : "backward";
  const step = direction === "forward" ? 1 : -1;

  // Direction change → complete all existing flips instantly
  let flips = [...activeFlips];
  let { currentSpread } = prev;
  if (flips.length > 0 && flips[0].direction !== direction) {
    currentSpread = latest;
    flips = [];
  }

  // Add one flip per step
  const firstNewId = prev.nextFlipId;
  let id = firstNewId;
  let from = latest;
  while (from !== value) {
    flips.push({
      id: id++,
      direction,
      fromSpread: from,
      targetSpread: from + step,
      done: false,
      staggerDelay: 0, // set after capping
    });
    from += step;
  }

  // Cap oldest flips
  while (flips.length > MAX_FLIPS) {
    currentSpread = flips[0].targetSpread;
    flips.shift();
  }

  // Set stagger delays for new flips only (existing keep theirs)
  let newIdx = 0;
  for (const f of flips) {
    if (f.id >= firstNewId) {
      f.staggerDelay = newIdx * STAGGER_MS;
      newIdx++;
    }
  }

  return { currentSpread, flips, nextFlipId: id };
}

export function useSpreadViewer({
  totalSpreads,
  pageWidth,
  pageHeight,
  containerRef,
  resetKey,
}: UseSpreadViewerOptions) {
  const [nav, setNav] = useState<SpreadNav>({
    currentSpread: 0,
    flips: [],
    nextFlipId: 0,
  });
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Reset when content changes (state-based prop tracking)
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (prevResetKey !== resetKey) {
    setPrevResetKey(resetKey);
    setNav({ currentSpread: 0, flips: [], nextFlipId: 0 });
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }

  // ── Spread navigation ──

  const goToSpread = useCallback(
    (direction: "forward" | "backward") => {
      setNav((prev) => {
        const activeFlips = prev.flips.filter((f) => !f.done);
        const latest =
          activeFlips.length > 0
            ? activeFlips[activeFlips.length - 1].targetSpread
            : prev.currentSpread;
        const target = direction === "forward" ? latest + 1 : latest - 1;
        return computeFlipsTo(prev, target, totalSpreads);
      });
    },
    [totalSpreads],
  );

  // Mark flip as done + advance currentSpread (keep element in DOM for 1 frame)
  const handleFlipEnd = useCallback((flipId: number) => {
    setNav((prev) => {
      const idx = prev.flips.findIndex((f) => f.id === flipId);
      if (idx === -1) return prev;
      const completed = prev.flips[idx];
      // Advance currentSpread only when the oldest active flip completes
      const firstActiveIdx = prev.flips.findIndex((f) => !f.done);
      const newCurrent =
        idx === firstActiveIdx
          ? completed.targetSpread
          : prev.currentSpread;
      return {
        ...prev,
        currentSpread: newCurrent,
        flips: prev.flips.map((f) =>
          f.id === flipId ? { ...f, done: true } : f,
        ),
      };
    });
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  // Cleanup done flips on next frame (prevents DOM flicker)
  useEffect(() => {
    const hasDone = nav.flips.some((f) => f.done);
    if (!hasDone) return;
    const id = requestAnimationFrame(() => {
      setNav((prev) => ({
        ...prev,
        flips: prev.flips.filter((f) => !f.done),
      }));
    });
    return () => cancelAnimationFrame(id);
  }, [nav.flips]);

  const prevSpread = useCallback(() => goToSpread("backward"), [goToSpread]);
  const nextSpread = useCallback(() => goToSpread("forward"), [goToSpread]);

  const handleSliderChange = useCallback(
    (value: number) => {
      setNav((prev) => computeFlipsTo(prev, value, totalSpreads));
      setScale(1);
      setOffset({ x: 0, y: 0 });
    },
    [totalSpreads],
  );

  // ── Zoom ──

  const zoomIn = useCallback(() => {
    setScale((prev) => Math.min(MAX_ZOOM, +(prev + ZOOM_STEP).toFixed(2)));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((prev) => {
      const next = Math.max(MIN_ZOOM, +(prev - ZOOM_STEP).toFixed(2));
      if (next <= 1) setOffset({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const resetZoom = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -WHEEL_ZOOM_STEP : WHEEL_ZOOM_STEP;
      setScale((prev) => {
        const next = Math.max(
          MIN_ZOOM,
          Math.min(MAX_ZOOM, +(prev + delta).toFixed(2)),
        );
        if (next <= 1) setOffset({ x: 0, y: 0 });
        return next;
      });
    };
    container.addEventListener("wheel", handler, { passive: false });
    return () => container.removeEventListener("wheel", handler);
  }, [containerRef]);

  // ── Drag / pan ──

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (scale <= 1) return;
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    },
    [scale, offset],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      const rawX = e.clientX - dragStart.x;
      const rawY = e.clientY - dragStart.y;
      const maxX = pageWidth * scale;
      const maxY = pageHeight * scale * 0.5;
      setOffset({
        x: Math.max(-maxX, Math.min(maxX, rawX)),
        y: Math.max(-maxY, Math.min(maxY, rawY)),
      });
    },
    [isDragging, scale, pageWidth, pageHeight, dragStart],
  );

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    const handler = () => setIsDragging(false);
    document.addEventListener("mouseup", handler);
    return () => document.removeEventListener("mouseup", handler);
  }, []);

  // ── Keyboard shortcuts ──

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prevSpread();
      if (e.key === "ArrowRight") nextSpread();
      if (e.key === "+" || e.key === "=") zoomIn();
      if (e.key === "-") zoomOut();
      if (e.key === "0") resetZoom();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [prevSpread, nextSpread, zoomIn, zoomOut, resetZoom]);

  const activeFlips = nav.flips.filter((f) => !f.done);

  return {
    currentSpread: nav.currentSpread,
    targetSpread:
      activeFlips.length > 0
        ? activeFlips[activeFlips.length - 1].targetSpread
        : nav.currentSpread,
    flips: nav.flips,
    scale,
    offset,
    isDragging,
    prevSpread,
    nextSpread,
    handleFlipEnd,
    handleSliderChange,
    zoomIn,
    zoomOut,
    resetZoom,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
}
