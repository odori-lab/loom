import { useState, useEffect, useCallback, type RefObject } from 'react'

export interface FlipState {
  direction: 'forward' | 'backward'
  targetSpread: number
  phase: 'pending' | 'animating'
}

// Zoom constants
const MIN_ZOOM = 0.5
const MAX_ZOOM = 3
const ZOOM_STEP = 0.25
const WHEEL_ZOOM_STEP = 0.1

// Combined state for spread navigation — keeps goToSpread/handleFlipEnd stable
interface SpreadNav {
  currentSpread: number
  flipState: FlipState | null
}

interface UseSpreadViewerOptions {
  totalSpreads: number
  pageWidth: number
  pageHeight: number
  containerRef: RefObject<HTMLDivElement | null>
  resetKey?: string | number
}

export function useSpreadViewer({
  totalSpreads,
  pageWidth,
  pageHeight,
  containerRef,
  resetKey,
}: UseSpreadViewerOptions) {
  const [nav, setNav] = useState<SpreadNav>({ currentSpread: 0, flipState: null })
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Reset when content changes (state-during-render pattern)
  const [prevResetKey, setPrevResetKey] = useState(resetKey)
  if (prevResetKey !== resetKey) {
    setPrevResetKey(resetKey)
    setNav({ currentSpread: 0, flipState: null })
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }

  // Reset zoom/pan on spread change (state-during-render pattern)
  const [prevSpreadIndex, setPrevSpreadIndex] = useState(nav.currentSpread)
  if (prevSpreadIndex !== nav.currentSpread) {
    setPrevSpreadIndex(nav.currentSpread)
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }

  // ── Spread navigation ──
  // Using functional setState on combined `nav` keeps these callbacks stable.

  const goToSpread = useCallback((direction: 'forward' | 'backward') => {
    setNav(prev => {
      if (prev.flipState) return prev
      const target = direction === 'forward' ? prev.currentSpread + 1 : prev.currentSpread - 1
      if (target < 0 || target >= totalSpreads) return prev
      return { ...prev, flipState: { direction, targetSpread: target, phase: 'pending' as const } }
    })
  }, [totalSpreads])

  // Trigger CSS transition one frame after flip starts
  useEffect(() => {
    if (!nav.flipState || nav.flipState.phase !== 'pending') return
    const id = requestAnimationFrame(() => {
      setNav(prev => {
        if (!prev.flipState || prev.flipState.phase !== 'pending') return prev
        return { ...prev, flipState: { ...prev.flipState, phase: 'animating' } }
      })
    })
    return () => cancelAnimationFrame(id)
  }, [nav.flipState])

  const handleFlipEnd = useCallback(() => {
    setNav(prev => {
      if (!prev.flipState) return prev
      return { currentSpread: prev.flipState.targetSpread, flipState: null }
    })
  }, [])

  const prevSpread = useCallback(() => goToSpread('backward'), [goToSpread])
  const nextSpread = useCallback(() => goToSpread('forward'), [goToSpread])

  const handleSliderChange = useCallback((value: number) => {
    setNav({ currentSpread: value, flipState: null })
  }, [])

  // ── Zoom ──

  const zoomIn = useCallback(() => {
    setScale(prev => Math.min(MAX_ZOOM, +(prev + ZOOM_STEP).toFixed(2)))
  }, [])

  const zoomOut = useCallback(() => {
    setScale(prev => {
      const next = Math.max(MIN_ZOOM, +(prev - ZOOM_STEP).toFixed(2))
      if (next <= 1) setOffset({ x: 0, y: 0 })
      return next
    })
  }, [])

  const resetZoom = useCallback(() => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -WHEEL_ZOOM_STEP : WHEEL_ZOOM_STEP
      setScale(prev => {
        const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, +(prev + delta).toFixed(2)))
        if (next <= 1) setOffset({ x: 0, y: 0 })
        return next
      })
    }
    container.addEventListener('wheel', handler, { passive: false })
    return () => container.removeEventListener('wheel', handler)
  }, [containerRef])

  // ── Drag / pan ──

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale <= 1) return
    e.preventDefault()
    setIsDragging(true)
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
  }, [scale, offset])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    const rawX = e.clientX - dragStart.x
    const rawY = e.clientY - dragStart.y
    const maxX = pageWidth * scale
    const maxY = pageHeight * scale * 0.5
    setOffset({
      x: Math.max(-maxX, Math.min(maxX, rawX)),
      y: Math.max(-maxY, Math.min(maxY, rawY)),
    })
  }, [isDragging, scale, pageWidth, pageHeight, dragStart])

  const handleMouseUp = useCallback(() => setIsDragging(false), [])

  useEffect(() => {
    const handler = () => setIsDragging(false)
    document.addEventListener('mouseup', handler)
    return () => document.removeEventListener('mouseup', handler)
  }, [])

  // ── Keyboard shortcuts ──

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

  return {
    currentSpread: nav.currentSpread,
    flipState: nav.flipState,
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
  }
}
