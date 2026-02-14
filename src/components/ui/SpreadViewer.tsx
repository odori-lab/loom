import { type ReactNode, type RefObject } from 'react'
import { type FlipState } from '@/hooks/useSpreadViewer'
import { useI18n } from '@/lib/i18n/context'
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/ui/Icons'

/* ─── FlipContainer ─── */

interface FlipContainerProps<T> {
  flipState: FlipState | null
  handleFlipEnd: () => void
  pageWidth: number
  current: { left: T; right: T }
  target: { left: T; right: T } | null
  renderPage: (data: T, side: 'left' | 'right', noShadow?: boolean) => ReactNode
}

export function FlipContainer<T>({
  flipState, handleFlipEnd, pageWidth, current, target, renderPage,
}: FlipContainerProps<T>) {
  // Normal (no flip)
  if (!flipState || !target) {
    return (
      <div className="flex gap-0.5">
        {renderPage(current.left, 'left')}
        {renderPage(current.right, 'right')}
      </div>
    )
  }

  const isForward = flipState.direction === 'forward'
  const flipTransform = flipState.phase === 'animating'
    ? `rotateY(${isForward ? -180 : 180}deg)`
    : 'rotateY(0deg)'

  return (
    <div style={{ perspective: '2000px' }} className="flex gap-0.5">
      {isForward ? (
        <>
          {/* Left side stays */}
          <div style={{ width: pageWidth, position: 'relative', zIndex: 0 }}>
            {renderPage(current.left, 'left')}
          </div>
          {/* Right side flips */}
          <div style={{ width: pageWidth, position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
              {renderPage(target.right, 'right')}
            </div>
            <div
              style={{
                position: 'relative',
                zIndex: 1,
                transformStyle: 'preserve-3d',
                transformOrigin: 'left center',
                transform: flipTransform,
                transition: flipState.phase === 'animating' ? 'transform 0.6s ease-in-out' : 'none',
              }}
              onTransitionEnd={handleFlipEnd}
            >
              <div style={{ backfaceVisibility: 'hidden' }}>
                {renderPage(current.right, 'right', true)}
              </div>
              <div style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', position: 'absolute', inset: 0 }}>
                {renderPage(target.left, 'left', true)}
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Left side flips */}
          <div style={{ width: pageWidth, position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
              {renderPage(target.left, 'left')}
            </div>
            <div
              style={{
                position: 'relative',
                zIndex: 1,
                transformStyle: 'preserve-3d',
                transformOrigin: 'right center',
                transform: flipTransform,
                transition: flipState.phase === 'animating' ? 'transform 0.6s ease-in-out' : 'none',
              }}
              onTransitionEnd={handleFlipEnd}
            >
              <div style={{ backfaceVisibility: 'hidden' }}>
                {renderPage(current.left, 'left', true)}
              </div>
              <div style={{ backfaceVisibility: 'hidden', transform: 'rotateY(-180deg)', position: 'absolute', inset: 0 }}>
                {renderPage(target.right, 'right', true)}
              </div>
            </div>
          </div>
          {/* Right side stays */}
          <div style={{ width: pageWidth, position: 'relative', zIndex: 0 }}>
            {renderPage(current.right, 'right')}
          </div>
        </>
      )}
    </div>
  )
}

/* ─── SpreadViewerContainer ───
   Wraps the zoom/pan area + navigation arrows.
   Consumers put their content (FlipContainer etc.) inside as children. */

interface SpreadViewerContainerProps {
  containerRef: RefObject<HTMLDivElement | null>
  scale: number
  isDragging: boolean
  resetZoom: () => void
  handleMouseDown: (e: React.MouseEvent) => void
  handleMouseMove: (e: React.MouseEvent) => void
  handleMouseUp: () => void
  currentSpread: number
  totalSpreads: number
  flipState: FlipState | null
  prevSpread: () => void
  nextSpread: () => void
  children: ReactNode
}

export function SpreadViewerContainer({
  containerRef, scale, isDragging, resetZoom,
  handleMouseDown, handleMouseMove, handleMouseUp,
  currentSpread, totalSpreads, flipState, prevSpread, nextSpread,
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
      style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
    >
      {children}
      <NavArrows
        currentSpread={currentSpread}
        totalSpreads={totalSpreads}
        flipState={flipState}
        prevSpread={prevSpread}
        nextSpread={nextSpread}
      />
    </div>
  )
}

/* ─── ZoomTransform ───
   Inner wrapper that applies zoom scale + pan offset. */

interface ZoomTransformProps {
  scale: number
  offset: { x: number; y: number }
  isDragging: boolean
  children: ReactNode
}

export function ZoomTransform({ scale, offset, isDragging, children }: ZoomTransformProps) {
  return (
    <div
      style={{
        transform: `scale(${scale}) translate(${offset.x / scale}px, ${offset.y / scale}px)`,
        transformOrigin: 'center center',
        transition: isDragging ? 'none' : 'transform 0.15s ease-out',
      }}
    >
      {children}
    </div>
  )
}

/* ─── NavArrows ─── */

interface NavArrowsProps {
  currentSpread: number
  totalSpreads: number
  flipState: FlipState | null
  prevSpread: () => void
  nextSpread: () => void
}

function NavArrows({ currentSpread, totalSpreads, flipState, prevSpread, nextSpread }: NavArrowsProps) {
  if (totalSpreads === 0) return null
  return (
    <>
      <button
        onClick={prevSpread}
        onMouseDown={(e) => e.stopPropagation()}
        disabled={currentSpread === 0 || !!flipState}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white shadow-md hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.97] transition-all duration-150 z-10"
      >
        <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
      </button>
      <button
        onClick={nextSpread}
        onMouseDown={(e) => e.stopPropagation()}
        disabled={currentSpread >= totalSpreads - 1 || !!flipState}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white shadow-md hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.97] transition-all duration-150 z-10"
      >
        <ChevronRightIcon className="w-5 h-5 text-gray-600" />
      </button>
    </>
  )
}

/* ─── SpreadSlider ─── */

interface SpreadSliderProps {
  currentSpread: number
  totalSpreads: number
  onSliderChange: (value: number) => void
}

export function SpreadSlider({ currentSpread, totalSpreads, onSliderChange }: SpreadSliderProps) {
  const { t } = useI18n()
  return (
    <>
      <span className="text-sm text-gray-400 whitespace-nowrap min-w-[90px] shrink-0">
        {t('create.preview.spread')} {currentSpread + 1} / {totalSpreads}
      </span>
      <input
        type="range"
        min={0}
        max={totalSpreads - 1}
        value={currentSpread}
        onChange={(e) => onSliderChange(Number(e.target.value))}
        className="flex-1 h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-gray-900
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:bg-gray-900 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
          [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-gray-900
          [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:cursor-pointer"
      />
    </>
  )
}

/* ─── ZoomControls ─── */

interface ZoomControlsProps {
  scale: number
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
}

export function ZoomControls({ scale, zoomIn, zoomOut, resetZoom }: ZoomControlsProps) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <button
        onClick={zoomOut}
        onMouseDown={(e) => e.stopPropagation()}
        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 active:scale-[0.97] transition-all duration-150"
        title="Zoom out (-)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
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
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  )
}
