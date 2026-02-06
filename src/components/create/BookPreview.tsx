'use client'

import { generatePageHtml } from '@/lib/pdf/generator'
import { SpreadData } from '@/lib/pdf/spreads'

interface BookPreviewProps {
  pages: string[]
  spreads: SpreadData[]
  currentSpread: number
  totalSpreads: number
  currentSpreadData: SpreadData | undefined
  selectedCount: number
  loading: boolean
  onPrevSpread: () => void
  onNextSpread: () => void
  onBack: () => void
  onGenerate: () => void
}

export function BookPreview({
  pages,
  spreads,
  currentSpread,
  totalSpreads,
  currentSpreadData,
  selectedCount,
  loading,
  onPrevSpread,
  onNextSpread,
  onBack,
  onGenerate,
}: BookPreviewProps) {
  return (
    <div className="flex-1 flex flex-col bg-gray-100">
      <div className="flex-1 p-6 flex items-center justify-center">
        {pages.length === 0 ? (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-200 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <p className="text-gray-500">Select posts to preview</p>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            {/* Prev button */}
            <button
              onClick={onPrevSpread}
              disabled={currentSpread === 0}
              className="p-2 rounded-full bg-white shadow-md hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Two-page spread - A5 ratio (148:210) */}
            {currentSpreadData && (
              <div className="flex gap-0.5">
                {/* Left page */}
                {currentSpreadData.left ? (
                  <div
                    className="overflow-hidden rounded-l-lg shadow-xl border-r border-gray-200"
                    style={{ width: '335px', height: '476px' }}
                  >
                    <iframe
                      srcDoc={generatePageHtml(currentSpreadData.left)}
                      className="bg-white"
                      style={{
                        width: '559px',
                        height: '793px',
                        transform: 'scale(0.6)',
                        transformOrigin: 'top left',
                        border: 'none'
                      }}
                      title={`Page ${currentSpreadData.leftIdx + 1}`}
                    />
                  </div>
                ) : (
                  <div
                    className="bg-gray-100 rounded-l-lg shadow-xl flex items-center justify-center border-r border-gray-200"
                    style={{ width: '335px', height: '476px' }}
                  />
                )}
                {/* Right page */}
                {currentSpreadData.right ? (
                  <div
                    className="overflow-hidden rounded-r-lg shadow-xl"
                    style={{ width: '335px', height: '476px' }}
                  >
                    <iframe
                      srcDoc={generatePageHtml(currentSpreadData.right)}
                      className="bg-white"
                      style={{
                        width: '559px',
                        height: '793px',
                        transform: 'scale(0.6)',
                        transformOrigin: 'top left',
                        border: 'none'
                      }}
                      title={`Page ${currentSpreadData.rightIdx + 1}`}
                    />
                  </div>
                ) : (
                  <div
                    className="bg-gray-100 rounded-r-lg shadow-xl flex items-center justify-center"
                    style={{ width: '335px', height: '476px' }}
                  />
                )}
              </div>
            )}

            {/* Next button */}
            <button
              onClick={onNextSpread}
              disabled={currentSpread >= totalSpreads - 1}
              className="p-2 rounded-full bg-white shadow-md hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      <div className="p-4 bg-white border-t border-gray-200 flex items-center justify-between">
        <button
          onClick={onBack}
          className="px-5 py-2.5 text-gray-600 hover:text-gray-900 font-medium transition-colors"
        >
          Back
        </button>
        <div className="flex items-center gap-4">
          {spreads.length > 0 && currentSpreadData && (
            <span className="text-sm text-gray-400">
              Spread {currentSpread + 1} / {spreads.length}
            </span>
          )}
          <span className="text-sm text-gray-500">
            {selectedCount} posts
          </span>
          <button
            onClick={onGenerate}
            disabled={selectedCount === 0 || loading}
            className="px-6 py-2.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                Generate PDF
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
