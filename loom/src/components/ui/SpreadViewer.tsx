import {
  type ReactNode,
  type RefObject,
  useCallback,
  useRef,
  useState,
} from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/Icons";
import type { FlipState } from "@/hooks/useSpreadViewer";

/* ─── FlipContainer (CSS animation + stagger + two-phase cleanup) ─── */

interface FlipContainerProps<T> {
  currentSpread: number;
  flips: FlipState[];
  getSpreadData: (index: number) => { left: T; right: T } | null;
  handleFlipEnd: (id: number) => void;
  pageWidth: number;
  renderPage: (
    data: T,
    side: "left" | "right",
    noShadow?: boolean,
  ) => ReactNode;
}

export function FlipContainer<T>({
  currentSpread,
  flips,
  getSpreadData,
  handleFlipEnd,
  pageWidth,
  renderPage,
}: FlipContainerProps<T>) {
  const currentData = getSpreadData(currentSpread);
  if (!currentData) return null;

  const activeFlips = flips.filter((f) => !f.done);
  const hasActive = activeFlips.length > 0;
  const isForward = hasActive && activeFlips[0].direction === "forward";
  const isBackward = hasActive && activeFlips[0].direction === "backward";
  const finalTarget = hasActive
    ? activeFlips[activeFlips.length - 1].targetSpread
    : currentSpread;
  const finalData = hasActive ? getSpreadData(finalTarget) : null;

  // Base pages shown underneath the flip stack
  const leftBase = isBackward && finalData ? finalData.left : currentData.left;
  const rightBase = isForward && finalData ? finalData.right : currentData.right;

  // Stable DOM: always two containers, flip elements are abs-positioned children
  return (
    <div style={{ perspective: "2000px" }} className="flex gap-0.5">
      {/* Left side */}
      <div style={{ width: pageWidth, position: "relative" }}>
        <div style={{ position: "relative", zIndex: 0 }}>
          {renderPage(leftBase, "left")}
        </div>
        {/* Backward flip stack */}
        {flips
          .filter((f) => f.direction === "backward")
          .map((flip, i, arr) => {
            const fromData = getSpreadData(flip.fromSpread);
            const toData = getSpreadData(flip.targetSpread);
            if (!fromData || !toData) return null;
            const zIndex = arr.length - i;
            return (
              <div
                key={flip.id}
                style={{
                  position: "absolute",
                  inset: 0,
                  zIndex,
                  transformStyle: "preserve-3d",
                  transformOrigin: "right center",
                  ...(flip.done
                    ? { transform: "rotateY(180deg)" }
                    : {
                        animation: `sv-flip-backward 0.4s ease-in-out ${flip.staggerDelay}ms both`,
                      }),
                }}
                onAnimationEnd={(e) => {
                  if (e.target === e.currentTarget) handleFlipEnd(flip.id);
                }}
              >
                <div
                  style={{
                    backfaceVisibility: "hidden",
                  }}
                >
                  {renderPage(fromData.left, "left", true)}
                </div>
                <div
                  style={{
                    backfaceVisibility: "hidden",
                    transform: "rotateY(-180deg)",
                    position: "absolute",
                    inset: 0,
                  }}
                >
                  {renderPage(toData.right, "right", true)}
                </div>
              </div>
            );
          })}
      </div>
      {/* Right side */}
      <div style={{ width: pageWidth, position: "relative" }}>
        <div style={{ position: "relative", zIndex: 0 }}>
          {renderPage(rightBase, "right")}
        </div>
        {/* Forward flip stack */}
        {flips
          .filter((f) => f.direction === "forward")
          .map((flip, i, arr) => {
            const fromData = getSpreadData(flip.fromSpread);
            const toData = getSpreadData(flip.targetSpread);
            if (!fromData || !toData) return null;
            const zIndex = arr.length - i;
            return (
              <div
                key={flip.id}
                style={{
                  position: "absolute",
                  inset: 0,
                  zIndex,
                  transformStyle: "preserve-3d",
                  transformOrigin: "left center",
                  ...(flip.done
                    ? { transform: "rotateY(-180deg)" }
                    : {
                        animation: `sv-flip-forward 0.4s ease-in-out ${flip.staggerDelay}ms both`,
                      }),
                }}
                onAnimationEnd={(e) => {
                  if (e.target === e.currentTarget) handleFlipEnd(flip.id);
                }}
              >
                <div
                  style={{
                    backfaceVisibility: "hidden",
                  }}
                >
                  {renderPage(fromData.right, "right", true)}
                </div>
                <div
                  style={{
                    backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                    position: "absolute",
                    inset: 0,
                  }}
                >
                  {renderPage(toData.left, "left", true)}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

/* ─── SpreadViewerContainer ───
   Wraps the zoom/pan area + navigation arrows.
   Consumers put their content (FlipContainer etc.) inside as children. */

interface SpreadViewerContainerProps {
  containerRef: RefObject<HTMLDivElement | null>;
  scale: number;
  isDragging: boolean;
  resetZoom: () => void;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  handleMouseUp: () => void;
  targetSpread: number;
  totalSpreads: number;
  prevSpread: () => void;
  nextSpread: () => void;
  children: ReactNode;
}

export function SpreadViewerContainer({
  containerRef,
  scale,
  isDragging,
  resetZoom,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  targetSpread,
  totalSpreads,
  prevSpread,
  nextSpread,
  children,
}: SpreadViewerContainerProps) {
  return (
    <div
      ref={containerRef}
      className="flex-1 flex items-center justify-center relative overflow-hidden select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={resetZoom}
      style={{
        cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default",
      }}
    >
      {children}
      <NavArrows
        targetSpread={targetSpread}
        totalSpreads={totalSpreads}
        prevSpread={prevSpread}
        nextSpread={nextSpread}
      />
    </div>
  );
}

/* ─── ZoomTransform ───
   Inner wrapper that applies zoom scale + pan offset. */

interface ZoomTransformProps {
  scale: number;
  offset: { x: number; y: number };
  isDragging: boolean;
  children: ReactNode;
}

export function ZoomTransform({
  scale,
  offset,
  isDragging,
  children,
}: ZoomTransformProps) {
  return (
    <div
      style={{
        transform: `scale(${scale}) translate(${offset.x / scale}px, ${offset.y / scale}px)`,
        transformOrigin: "center center",
        transition: isDragging ? "none" : "transform 0.15s ease-out",
      }}
    >
      {children}
    </div>
  );
}

/* ─── NavArrows ─── */

interface NavArrowsProps {
  targetSpread: number;
  totalSpreads: number;
  prevSpread: () => void;
  nextSpread: () => void;
}

function NavArrows({
  targetSpread,
  totalSpreads,
  prevSpread,
  nextSpread,
}: NavArrowsProps) {
  if (totalSpreads === 0) return null;
  return (
    <>
      <button
        onClick={prevSpread}
        onMouseDown={(e) => e.stopPropagation()}
        disabled={targetSpread === 0}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white shadow-md hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.97] transition-all duration-150 z-10"
      >
        <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
      </button>
      <button
        onClick={nextSpread}
        onMouseDown={(e) => e.stopPropagation()}
        disabled={targetSpread >= totalSpreads - 1}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white shadow-md hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.97] transition-all duration-150 z-10"
      >
        <ChevronRightIcon className="w-5 h-5 text-gray-600" />
      </button>
    </>
  );
}

/* ─── SpreadSlider ─── */

interface SpreadSliderProps {
  currentSpread: number;
  targetSpread: number;
  totalSpreads: number;
  onSliderChange: (value: number) => void;
}

export function SpreadSlider({
  currentSpread: _currentSpread,
  targetSpread,
  totalSpreads,
  onSliderChange,
}: SpreadSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragPercent, setDragPercent] = useState<number | null>(null);
  const lastEmittedSpread = useRef<number | null>(null);
  const hasMoved = useRef(false);

  const snappedPercent =
    totalSpreads > 1 ? targetSpread / (totalSpreads - 1) : 0;
  const displayPercent = dragPercent ?? snappedPercent;

  const getRatio = useCallback((clientX: number) => {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const updateDrag = useCallback(
    (ratio: number) => {
      setDragPercent(ratio);
      const spread = Math.round(ratio * (totalSpreads - 1));
      if (spread !== lastEmittedSpread.current) {
        lastEmittedSpread.current = spread;
        onSliderChange(spread);
      }
    },
    [totalSpreads, onSliderChange],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      hasMoved.current = false;
      lastEmittedSpread.current = targetSpread;
    },
    [targetSpread],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (lastEmittedSpread.current === null) return;
      hasMoved.current = true;
      updateDrag(getRatio(e.clientX));
    },
    [getRatio, updateDrag],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (lastEmittedSpread.current === null) return;
      if (!hasMoved.current) {
        // Click (no drag) — emit target, thumb transitions via CSS
        const spread = Math.round(getRatio(e.clientX) * (totalSpreads - 1));
        onSliderChange(spread);
      }
      setDragPercent(null);
      lastEmittedSpread.current = null;
    },
    [getRatio, totalSpreads, onSliderChange],
  );

  return (
    <div
      ref={trackRef}
      className="flex-1 relative h-5 flex items-center cursor-pointer"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Track */}
      <div className="w-full h-1.5 bg-gray-200 rounded-full" />
      {/* Thumb */}
      <div
        className="absolute w-4 h-4 bg-gray-900 rounded-full -translate-x-1/2 pointer-events-none"
        style={{
          left: `${displayPercent * 100}%`,
          transition: dragPercent !== null ? "none" : "left 0.3s ease-out",
        }}
      />
    </div>
  );
}

/* ─── ZoomControls ─── */

interface ZoomControlsProps {
  scale: number;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
}

export function ZoomControls({
  scale,
  zoomIn,
  zoomOut,
  resetZoom,
}: ZoomControlsProps) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <button
        onClick={zoomOut}
        onMouseDown={(e) => e.stopPropagation()}
        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 active:scale-[0.97] transition-all duration-150"
        title="Zoom out (-)"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 12H4"
          />
        </svg>
      </button>
      <button
        onClick={resetZoom}
        onMouseDown={(e) => e.stopPropagation()}
        className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded-lg active:scale-[0.97] transition-all duration-150 min-w-[48px] text-center"
        title="Reset zoom (0)"
      >
        {Math.round(scale * 100)}%
      </button>
      <button
        onClick={zoomIn}
        onMouseDown={(e) => e.stopPropagation()}
        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 active:scale-[0.97] transition-all duration-150"
        title="Zoom in (+)"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>
    </div>
  );
}
