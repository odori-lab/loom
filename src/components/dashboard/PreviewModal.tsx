'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { useDashboard } from './DashboardContext'
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/ui/Icons'

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

const PAGE_WIDTH = 560

interface SpreadData {
  leftPage: number | null
  rightPage: number | null
}

function buildSpreads(numPages: number): SpreadData[] {
  if (numPages === 0) return []

  const spreads: SpreadData[] = []

  // First spread: empty left, page 1 on right (cover)
  spreads.push({ leftPage: null, rightPage: 1 })

  // Middle spreads: pairs of (even, odd) starting from page 2
  let page = 2
  while (page <= numPages) {
    const left = page
    const right = page + 1 <= numPages ? page + 1 : null
    spreads.push({ leftPage: left, rightPage: right })
    page += 2
  }

  return spreads
}

function SpreadViewer({ url }: { url: string }) {
  const [numPages, setNumPages] = useState<number>(0)
  const [currentSpread, setCurrentSpread] = useState(0)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  // Flip animation
  const [flipState, setFlipState] = useState<{
    direction: 'forward' | 'backward'
    targetSpread: number
    phase: 'start' | 'animating'
  } | null>(null)

  const spreads = useMemo(() => buildSpreads(numPages), [numPages])
  const totalSpreads = spreads.length

  // Navigate with flip animation
  const goToSpread = useCallback((direction: 'forward' | 'backward') => {
    if (flipState) return
    const target = direction === 'forward' ? currentSpread + 1 : currentSpread - 1
    if (target < 0 || target >= totalSpreads) return
    setFlipState({ direction, targetSpread: target, phase: 'start' })
  }, [flipState, currentSpread, totalSpreads])

  // Start flip transition after mount so CSS transition runs
  useEffect(() => {
    if (!flipState || flipState.phase !== 'start') return
    const id = requestAnimationFrame(() => {
      setFlipState(prev => prev && prev.phase === 'start' ? { ...prev, phase: 'animating' } : prev)
    })
    return () => cancelAnimationFrame(id)
  }, [flipState])

  const handleFlipEnd = useCallback(() => {
    if (!flipState) return
    setCurrentSpread(flipState.targetSpread)
    setFlipState(null)
  }, [flipState])

  const prevSpread = useCallback(() => goToSpread('backward'), [goToSpread])
  const nextSpread = useCallback(() => goToSpread('forward'), [goToSpread])

  // Reset zoom/pan on spread change
  useEffect(() => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }, [currentSpread])

  const zoomIn = useCallback(() => {
    setScale(prev => Math.min(3, +(prev + 0.25).toFixed(2)))
  }, [])

  const zoomOut = useCallback(() => {
    setScale(prev => {
      const next = Math.max(0.5, +(prev - 0.25).toFixed(2))
      if (next <= 1) setOffset({ x: 0, y: 0 })
      return next
    })
  }, [])

  const resetZoom = useCallback(() => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }, [])

  // Wheel zoom (passive: false to allow preventDefault)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      setScale(prev => {
        const next = Math.max(0.5, Math.min(3, +(prev + delta).toFixed(2)))
        if (next <= 1) setOffset({ x: 0, y: 0 })
        return next
      })
    }
    container.addEventListener('wheel', handler, { passive: false })
    return () => container.removeEventListener('wheel', handler)
  }, [])

  // Drag with limits
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale <= 1) return
    e.preventDefault()
    setIsDragging(true)
    dragStartRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y }
  }, [scale, offset])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    const rawX = e.clientX - dragStartRef.current.x
    const rawY = e.clientY - dragStartRef.current.y
    const maxX = PAGE_WIDTH * scale
    const maxY = PAGE_WIDTH * (210 / 148) * scale * 0.5
    setOffset({
      x: Math.max(-maxX, Math.min(maxX, rawX)),
      y: Math.max(-maxY, Math.min(maxY, rawY)),
    })
  }, [isDragging, scale])

  const handleMouseUp = useCallback(() => setIsDragging(false), [])

  useEffect(() => {
    const handler = () => setIsDragging(false)
    document.addEventListener('mouseup', handler)
    return () => document.removeEventListener('mouseup', handler)
  }, [])

  // Keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevSpread()
      if (e.key === 'ArrowRight') nextSpread()
      if (e.key === '+' || e.key === '=') zoomIn()
      if (e.key === '-') zoomOut()
      if (e.key === '0') resetZoom()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [prevSpread, nextSpread, zoomIn, zoomOut, resetZoom])

  // Slider (cancels any ongoing flip)
  const handleSliderChange = useCallback((value: number) => {
    setFlipState(null)
    setCurrentSpread(value)
  }, [])

  const currentData = spreads[currentSpread] ?? null
  const targetData = flipState ? spreads[flipState.targetSpread] ?? null : null

  // Render a single page (or placeholder). noShadow disables shadow during flip.
  const renderPage = (pageNum: number | null, side: 'left' | 'right', noShadow = false) => {
    const rounded = side === 'left' ? 'rounded-l-lg' : 'rounded-r-lg'
    const shadow = noShadow ? '' : 'shadow-xl'
    if (pageNum) {
      return (
        <div className={`overflow-hidden ${rounded} ${shadow} bg-white`} style={{ width: PAGE_WIDTH }}>
          <Page pageNumber={pageNum} width={PAGE_WIDTH} renderAnnotationLayer={false} renderTextLayer={false} />
        </div>
      )
    }
    return (
      <div className={`bg-gray-200 ${rounded} ${shadow}`} style={{ width: PAGE_WIDTH, aspectRatio: '148 / 210' }} />
    )
  }

  // Render the spread content (normal or with flip animation)
  const renderSpread = () => {
    if (!currentData) return null

    // Normal (no flip)
    if (!flipState || !targetData) {
      return (
        <div className="flex gap-0.5">
          {renderPage(currentData.leftPage, 'left')}
          {renderPage(currentData.rightPage, 'right')}
        </div>
      )
    }

    const isForward = flipState.direction === 'forward'
    const isEdge = currentSpread === 0 || flipState.targetSpread === 0
      || currentSpread === totalSpreads - 1 || flipState.targetSpread === totalSpreads - 1

    // Edge spreads (cover/back): flat rotateY. Inner pages: diagonal peel from top corner.
    let flipTransform: string
    if (flipState.phase !== 'animating') {
      flipTransform = isEdge ? 'rotateY(0deg)' : 'rotateY(0deg) rotateZ(0deg) rotateX(0deg)'
    } else if (isEdge) {
      flipTransform = `rotateY(${isForward ? -180 : 180}deg)`
    } else {
      flipTransform = isForward
        ? 'rotateY(-180deg) rotateZ(-4deg) rotateX(-5deg)'
        : 'rotateY(180deg) rotateZ(4deg) rotateX(-5deg)'
    }

    return (
      <div style={{ perspective: '2000px' }} className="flex gap-0.5">
        {isForward ? (
          <>
            {/* Left side: current left (will be covered by flip) */}
            <div style={{ width: PAGE_WIDTH, position: 'relative', zIndex: 0 }}>
              {renderPage(currentData.leftPage, 'left')}
            </div>

            {/* Right side: flip animation */}
            <div style={{ width: PAGE_WIDTH, position: 'relative' }}>
              {/* Underneath: next right page (revealed as flip progresses) */}
              <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                {renderPage(targetData.rightPage, 'right')}
              </div>

              {/* Flipping page (no shadow to avoid doubling) */}
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
                {/* Front face: current right page */}
                <div style={{ backfaceVisibility: 'hidden' }}>
                  {renderPage(currentData.rightPage, 'right', true)}
                </div>
                {/* Back face: next left page */}
                <div style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', position: 'absolute', inset: 0 }}>
                  {renderPage(targetData.leftPage, 'left', true)}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Left side: flip animation */}
            <div style={{ width: PAGE_WIDTH, position: 'relative' }}>
              {/* Underneath: prev left page (revealed as flip progresses) */}
              <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                {renderPage(targetData.leftPage, 'left')}
              </div>

              {/* Flipping page (no shadow to avoid doubling) */}
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
                {/* Front face: current left page */}
                <div style={{ backfaceVisibility: 'hidden' }}>
                  {renderPage(currentData.leftPage, 'left', true)}
                </div>
                {/* Back face: prev right page */}
                <div style={{ backfaceVisibility: 'hidden', transform: 'rotateY(-180deg)', position: 'absolute', inset: 0 }}>
                  {renderPage(targetData.rightPage, 'right', true)}
                </div>
              </div>
            </div>

            {/* Right side: current right (stays) */}
            <div style={{ width: PAGE_WIDTH, position: 'relative', zIndex: 0 }}>
              {renderPage(currentData.rightPage, 'right')}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Spread area */}
      <div
        ref={containerRef}
        className="flex-1 flex align-center justify-center relative overflow-hidden select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={resetZoom}
        style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
      >
        <Document
          file={url}
          onLoadSuccess={({ numPages: n }) => setNumPages(n)}
          loading={
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full border-4 border-gray-200 border-t-gray-900 animate-spin" />
                <p className="text-sm text-gray-500">Loading PDF...</p>
              </div>
            </div>
          }
          error={
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <p className="text-gray-500">Failed to load PDF</p>
              </div>
            </div>
          }
        >
          {numPages > 0 && currentData && (
            <div className="h-full flex items-center justify-center">
              <div
                style={{
                  transform: `scale(${scale}) translate(${offset.x / scale}px, ${offset.y / scale}px)`,
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                }}
              >
                {renderSpread()}
              </div>
            </div>
          )}
        </Document>

        {/* Navigation arrows - absolute, unaffected by zoom */}
        {numPages > 0 && (
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
        )}
      </div>

      {/* Bottom bar: slider + spread counter + zoom controls */}
      {totalSpreads > 0 && (
        <div className="h-16 px-8 flex items-center gap-4 bg-white border-t border-gray-200 shrink-0">
          <span className="text-sm text-gray-400 whitespace-nowrap min-w-[110px]">
            Spread {currentSpread + 1} / {totalSpreads}
          </span>
          <input
            type="range"
            min={0}
            max={totalSpreads - 1}
            value={currentSpread}
            onChange={(e) => handleSliderChange(Number(e.target.value))}
            className="flex-1 h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-gray-900
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:bg-gray-900 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
              [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-gray-900
              [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:cursor-pointer"
          />
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={zoomOut}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 active:scale-[0.97] transition-all duration-150"
              title="Zoom out (-)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <button
              onClick={resetZoom}
              className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded-lg active:scale-[0.97] transition-all duration-150 min-w-[48px] text-center"
              title="Reset zoom (0)"
            >
              {Math.round(scale * 100)}%
            </button>
            <button
              onClick={zoomIn}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 active:scale-[0.97] transition-all duration-150"
              title="Zoom in (+)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export function PreviewModal() {
  const { previewModalOpen, previewUrl, loadingPreview, selectedLoom, closePreviewModal } = useDashboard()

  // Escape key to close modal
  useEffect(() => {
    if (!previewModalOpen) return

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePreviewModal()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [previewModalOpen, closePreviewModal])

  if (!previewModalOpen || !selectedLoom) return null

  return (
    <div className="fixed inset-0 z-50 bg-gray-100 flex flex-col animate-fade-in" style={{ animationDuration: '0.15s' }}>
      {/* Header */}
      <div className="h-14 px-6 flex items-center justify-between bg-white border-b border-gray-200 shrink-0 animate-fade-in-up" style={{ animationDuration: '0.2s' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <span className="text-xs font-bold text-white">
              {(selectedLoom.thread_display_name || selectedLoom.thread_username)?.[0]?.toUpperCase() || '?'}
            </span>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              {selectedLoom.thread_display_name || `@${selectedLoom.thread_username}`}
            </h2>
            <p className="text-xs text-gray-500">{selectedLoom.post_count} posts</p>
          </div>
        </div>
        <button
          onClick={closePreviewModal}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 active:scale-[0.97] transition-all duration-150"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content area */}
      {loadingPreview ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full border-4 border-gray-200 border-t-gray-900 animate-spin" />
            <p className="text-sm text-gray-500">Loading preview...</p>
          </div>
        </div>
      ) : previewUrl ? (
        <SpreadViewer key={previewUrl} url={previewUrl} />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-gray-500">Failed to load preview</p>
          </div>
        </div>
      )}
    </div>
  )
}
