'use client'

import { useDashboard } from './DashboardContext'
import dynamic from 'next/dynamic'

const PdfPageViewer = dynamic(
  () => import('@/components/ui/PdfPageViewer').then((mod) => mod.PdfPageViewer),
  { ssr: false }
)

export function LoomPreviewPanel() {
  const { selectedLoom, previewUrl, loadingPreview, openPreviewModal } = useDashboard()

  if (!selectedLoom) {
    return (
      <div className="w-[600px] bg-gray-50 border-l border-gray-100 flex items-center justify-center shrink-0">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gray-200/50 flex items-center justify-center">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <p className="text-gray-500 font-medium">Select a Loom to preview</p>
          <p className="text-sm text-gray-400 mt-1">Click on any item from the grid</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-[600px] bg-gray-50 border-l border-gray-100 flex flex-col shrink-0">
      <div className="flex-1 overflow-y-auto px-4 snap-y snap-mandatory">
        {loadingPreview ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full border-4 border-gray-200 border-t-gray-900 animate-spin" />
              <p className="text-sm text-gray-500">Loading preview...</p>
            </div>
          </div>
        ) : previewUrl ? (
          <PdfPageViewer url={previewUrl} width={568} snapScroll onPageClick={() => openPreviewModal()} />
        ) : (
          <div className="h-full flex items-center justify-center">
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
    </div>
  )
}
