'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { useDashboard } from './DashboardContext'
import { useI18n } from '@/lib/i18n/context'
import { useSpreadViewer } from '@/hooks/useSpreadViewer'
import { FlipContainer, SpreadViewerContainer, ZoomTransform, SpreadSlider, ZoomControls } from '@/components/ui/SpreadViewer'

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

const PAGE_WIDTH = 560

interface SpreadData {
  leftPage: number | null
  rightPage: number | null
}

function buildSpreads(numPages: number): SpreadData[] {
  if (numPages === 0) return []
  const spreads: SpreadData[] = []
  spreads.push({ leftPage: null, rightPage: 1 })
  let page = 2
  while (page <= numPages) {
    const left = page
    const right = page + 1 <= numPages ? page + 1 : null
    spreads.push({ leftPage: left, rightPage: right })
    page += 2
  }
  return spreads
}

function PdfPage({ pageNum, side, noShadow = false }: { pageNum: number | null; side: 'left' | 'right'; noShadow?: boolean }) {
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

function renderPage(pageNum: number | null, side: 'left' | 'right', noShadow?: boolean) {
  return <PdfPage pageNum={pageNum} side={side} noShadow={noShadow} />
}

function PdfSpreadViewer({ url }: { url: string }) {
  const { t } = useI18n()
  const [numPages, setNumPages] = useState<number>(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const spreads = useMemo(() => buildSpreads(numPages), [numPages])
  const totalSpreads = spreads.length

  const {
    currentSpread, flipState, scale, offset, isDragging,
    prevSpread, nextSpread, handleFlipEnd,
    zoomIn, zoomOut, resetZoom,
    handleMouseDown, handleMouseMove, handleMouseUp, handleSliderChange,
  } = useSpreadViewer({
    totalSpreads,
    pageWidth: PAGE_WIDTH,
    pageHeight: Math.round(PAGE_WIDTH * (210 / 148)),
    containerRef,
  })

  const currentData = spreads[currentSpread] ?? null
  const targetData = flipState ? spreads[flipState.targetSpread] ?? null : null

  return (
    <>
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
        <Document
          file={url}
          onLoadSuccess={({ numPages: n }) => setNumPages(n)}
          loading={<div />}
          error={
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <p className="text-gray-500">{t('create.preview.failedPdf')}</p>
              </div>
            </div>
          }
        >
          {numPages > 0 && currentData && (
            <div className="h-full flex items-center justify-center">
              <ZoomTransform scale={scale} offset={offset} isDragging={isDragging}>
                <FlipContainer<number | null>
                  flipState={flipState}
                  handleFlipEnd={handleFlipEnd}
                  pageWidth={PAGE_WIDTH}
                  current={{ left: currentData.leftPage, right: currentData.rightPage }}
                  target={targetData ? { left: targetData.leftPage, right: targetData.rightPage } : null}
                  renderPage={renderPage}
                />
              </ZoomTransform>
            </div>
          )}
        </Document>
      </SpreadViewerContainer>

      {/* Bottom bar */}
      {totalSpreads > 0 && (
        <div className="h-16 px-8 flex items-center gap-4 bg-white border-t border-gray-200 shrink-0">
          <SpreadSlider
            currentSpread={currentSpread}
            totalSpreads={totalSpreads}
            onSliderChange={handleSliderChange}
          />
          <div className="ml-2">
            <ZoomControls
              scale={scale}
              zoomIn={zoomIn}
              zoomOut={zoomOut}
              resetZoom={resetZoom}
            />
          </div>
        </div>
      )}
    </>
  )
}

export function PreviewModal() {
  const { t } = useI18n()
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
            <p className="text-xs text-gray-500">{selectedLoom.post_count} {t('create.preview.posts')}</p>
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
            <p className="text-sm text-gray-500">{t('dashboard.preview.loading')}</p>
          </div>
        </div>
      ) : previewUrl ? (
        <PdfSpreadViewer key={previewUrl} url={previewUrl} />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-gray-500">{t('dashboard.preview.error')}</p>
          </div>
        </div>
      )}
    </div>
  )
}
