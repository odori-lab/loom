'use client'

import { useEffect } from 'react'
import { useDashboard } from './DashboardContext'

export function PreviewModal() {
  const { previewModalOpen, previewUrl, selectedLoom, closePreviewModal } = useDashboard()

  useEffect(() => {
    if (!previewModalOpen) return

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePreviewModal()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [previewModalOpen, closePreviewModal])

  if (!previewModalOpen || !previewUrl || !selectedLoom) return null

  return (
    <div className="fixed inset-0 z-50 bg-gray-100 flex flex-col">
      {/* Header */}
      <div className="h-14 px-6 flex items-center justify-between bg-white border-b border-gray-200 shrink-0">
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
          className="p-2 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* PDF viewer */}
      <div className="flex-1 p-6">
        <iframe
          src={previewUrl}
          className="w-full h-full rounded-xl bg-white shadow-lg border border-gray-200"
          title="PDF Preview"
        />
      </div>
    </div>
  )
}
