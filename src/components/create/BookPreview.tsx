'use client'

import { useRef } from 'react'
import { generatePageHtml } from '@/lib/pdf/generator'
import { useCreateFlow } from './CreateFlowContext'
import { useI18n } from '@/lib/i18n/context'
import { useSpreadViewer } from '@/hooks/useSpreadViewer'
import { FlipContainer, SpreadViewerContainer, ZoomTransform, SpreadSlider, ZoomControls } from '@/components/ui/SpreadViewer'

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

function PageFrame({ html, side, noShadow = false }: { html: string | null; side: 'left' | 'right'; noShadow?: boolean }) {
  const rounded = side === 'left' ? 'rounded-l-lg' : 'rounded-r-lg'
  const shadow = noShadow ? '' : 'shadow-xl'
  if (!html) {
    return (
      <div className={`bg-gray-200 ${rounded} ${shadow}`} style={{ width: PAGE_WIDTH, height: PAGE_HEIGHT }} />
    )
  }
  const scale = PAGE_WIDTH / 559
  return (
    <div className={`overflow-hidden ${rounded} ${shadow} bg-white`} style={{ width: PAGE_WIDTH, height: PAGE_HEIGHT }}>
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

function renderPage(html: string | null, side: 'left' | 'right', noShadow?: boolean) {
  return <PageFrame html={html} side={side} noShadow={noShadow} />
}

export function BookPreview() {
  const {
    state: { loading },
    actions: { goBack, generateLoom },
    meta: { pages, spreads, selectedCount },
  } = useCreateFlow()
  const { t } = useI18n()
  const containerRef = useRef<HTMLDivElement>(null)

  const totalSpreads = spreads.length

  const {
    currentSpread, flipState, scale, offset, isDragging,
    prevSpread, nextSpread, handleFlipEnd,
    zoomIn, zoomOut, resetZoom,
    handleMouseDown, handleMouseMove, handleMouseUp, handleSliderChange,
  } = useSpreadViewer({
    totalSpreads,
    pageWidth: PAGE_WIDTH,
    pageHeight: PAGE_HEIGHT,
    containerRef,
    resetKey: pages.length,
  })

  const currentData = spreads[currentSpread] ?? null
  const targetData = flipState ? spreads[flipState.targetSpread] ?? null : null

  return (
    <div className="flex-1 flex flex-col bg-gray-100" style={{ animation: 'slideInRight 0.35s ease-out both' }}>
      {/* Spread area */}
      <SpreadViewerContainer
        containerRef={containerRef}
        scale={scale}
        isDragging={isDragging}
        resetZoom={resetZoom}
        handleMouseDown={handleMouseDown}
        handleMouseMove={handleMouseMove}
        handleMouseUp={handleMouseUp}
        currentSpread={currentSpread}
        totalSpreads={totalSpreads}
        flipState={flipState}
        prevSpread={prevSpread}
        nextSpread={nextSpread}
      >
        {pages.length === 0 ? <EmptyPreview label={t('create.preview.selectPosts')} /> : (
          <ZoomTransform scale={scale} offset={offset} isDragging={isDragging}>
            <FlipContainer<string | null>
              flipState={flipState}
              handleFlipEnd={handleFlipEnd}
              pageWidth={PAGE_WIDTH}
              current={{ left: currentData?.left ?? null, right: currentData?.right ?? null }}
              target={targetData ? { left: targetData.left, right: targetData.right } : null}
              renderPage={renderPage}
            />
          </ZoomTransform>
        )}
      </SpreadViewerContainer>

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
            <SpreadSlider
              currentSpread={currentSpread}
              totalSpreads={totalSpreads}
              onSliderChange={handleSliderChange}
            />
            <ZoomControls
              scale={scale}
              zoomIn={zoomIn}
              zoomOut={zoomOut}
              resetZoom={resetZoom}
            />
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
