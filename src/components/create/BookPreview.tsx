'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { generatePageHtml } from '@/lib/pdf/generator'
import { useCreateFlow } from './CreateFlowContext'
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/ui/Icons'
import { useI18n } from '@/lib/i18n/context'

const PAGE_WIDTH = 280
const PAGE_HEIGHT = Math.round(PAGE_WIDTH * (210 / 148))

function EmptyPreview({ label }: { label: string }) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-200 flex items-center justify-center">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      </div>
      <p className="text-gray-500">{label}</p>
    </div>
  )
}

function proxyImageUrls(html: string): string {
  return html.replace(
    /(<img\s[^>]*src=")([^"]+cdninstagram\.com[^"]+)(")/g,
    (_match, before, url, after) => `${before}/api/proxy-image?url=${encodeURIComponent(url)}${after}`
  )
}

function PageFrame({ html, side }: { html: string | null; side: 'left' | 'right'; }) {
  const rounded = side === 'left' ? 'rounded-l-lg' : 'rounded-r-lg'
  if (!html) {
    return (
      <div className={`bg-gray-200 ${rounded} shadow-xl`} style={{ width: PAGE_WIDTH, height: PAGE_HEIGHT }} />
    )
  }
  const scale = PAGE_WIDTH / 559
  return (
    <div className={`overflow-hidden ${rounded} shadow-xl bg-white`} style={{ width: PAGE_WIDTH, height: PAGE_HEIGHT }}>
      <iframe
        srcDoc={generatePageHtml(proxyImageUrls(html))}
        className="bg-white pointer-events-none"
        scrolling="no"
        style={{
          width: '559px',
          height: '793px',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          border: 'none',
          overflow: 'hidden',
        }}
        title="Page preview"
      />
    </div>
  )
}

export function BookPreview() {
  const {
    state: { loading },
    actions: { goBack, generateLoom },
    meta: { pages, spreads, selectedCount },
  } = useCreateFlow()
  const { t } = useI18n()

  const [currentSpread, setCurrentSpread] = useState(0)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const totalSpreads = spreads.length

  // Flip animation state
  const [flipState, setFlipState] = useState<{
    direction: 'forward' | 'backward'
    targetSpread: number
    phase: 'start' | 'animating'
  } | null>(null)

  // Reset spread when pages change
  const prevPagesLength = useRef(pages.length)
  if (prevPagesLength.current !== pages.length) {
    prevPagesLength.current = pages.length
    setCurrentSpread(0)
    setFlipState(null)
  }

  const goToSpread = useCallback((direction: 'forward' | 'backward') => {
    if (flipState) return
    const target = direction === 'forward' ? currentSpread + 1 : currentSpread - 1
    if (target < 0 || target >= totalSpreads) return
    setFlipState({ direction, targetSpread: target, phase: 'start' })
  }, [flipState, currentSpread, totalSpreads])

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
  const prevSpreadRef = useRef(currentSpread)
  if (prevSpreadRef.current !== currentSpread) {
    prevSpreadRef.current = currentSpread
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }

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

  // Wheel zoom
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

  // Drag
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
    const maxY = PAGE_HEIGHT * scale * 0.5
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

  const handleSliderChange = useCallback((value: number) => {
    setFlipState(null)
    setCurrentSpread(value)
  }, [])

  const currentData = spreads[currentSpread] ?? null
  const targetData = flipState ? spreads[flipState.targetSpread] ?? null : null

  const renderSpread = () => {
    if (!currentData) return null

    if (!flipState || !targetData) {
      return (
        <div className="flex gap-0.5">
          <PageFrame html={currentData.left} side="left" />
          <PageFrame html={currentData.right} side="right" />
        </div>
      )
    }

    const isForward = flipState.direction === 'forward'
    const isEdge = currentSpread === 0 || flipState.targetSpread === 0
      || currentSpread === totalSpreads - 1 || flipState.targetSpread === totalSpreads - 1

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
            <div style={{ width: PAGE_WIDTH, position: 'relative', zIndex: 0 }}>
              <PageFrame html={currentData.left} side="left" />
            </div>
            <div style={{ width: PAGE_WIDTH, position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                <PageFrame html={targetData.right} side="right" />
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
                  <PageFrame html={currentData.right} side="right" />
                </div>
                <div style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', position: 'absolute', inset: 0 }}>
                  <PageFrame html={targetData.left} side="left" />
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div style={{ width: PAGE_WIDTH, position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                <PageFrame html={targetData.left} side="left" />
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
                  <PageFrame html={currentData.left} side="left" />
                </div>
                <div style={{ backfaceVisibility: 'hidden', transform: 'rotateY(-180deg)', position: 'absolute', inset: 0 }}>
                  <PageFrame html={targetData.right} side="right" />
                </div>
              </div>
            </div>
            <div style={{ width: PAGE_WIDTH, position: 'relative', zIndex: 0 }}>
              <PageFrame html={currentData.right} side="right" />
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-100" style={{ animation: 'slideInRight 0.35s ease-out both' }}>
      {/* Spread area */}
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
        {pages.length === 0 ? <EmptyPreview label={t('create.preview.selectPosts')} /> : (
          <div
            style={{
              transform: `scale(${scale}) translate(${offset.x / scale}px, ${offset.y / scale}px)`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            }}
          >
            {renderSpread()}
          </div>
        )}

        {/* Navigation arrows */}
        {totalSpreads > 0 && (
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

      {/* Bottom bar: back, slider, zoom, generate */}
      <div className="h-16 px-4 flex items-center gap-3 bg-white border-t border-gray-200 shrink-0">
        <button
          onClick={goBack}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors shrink-0"
        >
          {t('create.preview.back')}
        </button>

        {totalSpreads > 0 && (
          <>
            <span className="text-sm text-gray-400 whitespace-nowrap min-w-[90px] shrink-0">
              {t('create.preview.spread')} {currentSpread + 1} / {totalSpreads}
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
          </>
        )}

        <div className="flex items-center gap-3 ml-auto shrink-0">
          <span className="text-sm text-gray-500">{selectedCount} {t('create.preview.posts')}</span>
          <button
            onClick={generateLoom}
            disabled={selectedCount === 0 || loading}
            className="px-5 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 relative overflow-hidden"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t('create.preview.generating')}
                <div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent"
                  style={{ animation: 'shimmer 1.5s infinite linear', backgroundSize: '200% 100%' }}
                />
              </>
            ) : (
              <>
                {t('create.preview.generatePdf')}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
