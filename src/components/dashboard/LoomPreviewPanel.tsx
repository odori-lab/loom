'use client'

import { useDashboard } from './DashboardContext'
import { DownloadIcon } from '@/components/ui/Icons'

export function LoomPreviewPanel() {
  const { selectedLoom, previewUrl, loadingPreview, openPreviewModal } = useDashboard()

  if (!selectedLoom) {
    return (
      <div className="w-[400px] bg-gray-50 border-l border-gray-100 flex items-center justify-center shrink-0">
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
    <div className="w-[400px] bg-gray-50 border-l border-gray-100 flex flex-col shrink-0">
      {/* Header */}
      <div className="p-5 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <span className="text-sm font-bold text-white">
              {(selectedLoom.thread_display_name || selectedLoom.thread_username)?.[0]?.toUpperCase() || '?'}
            </span>
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">
              {selectedLoom.thread_display_name || `@${selectedLoom.thread_username}`}
            </h2>
            <p className="text-sm text-gray-500">{selectedLoom.post_count} posts</p>
          </div>
        </div>
        {previewUrl && (
          <div className="flex gap-2">
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg font-medium hover:bg-gray-800 transition-all"
            >
              <DownloadIcon className="w-4 h-4" />
              Download
            </a>
            <button
              onClick={openPreviewModal}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg font-medium hover:bg-gray-200 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Preview
            </button>
          </div>
        )}
      </div>

      {/* PDF Preview */}
      <div className="flex-1 p-4">
        {loadingPreview ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full border-4 border-gray-200 border-t-gray-900 animate-spin" />
              <p className="text-sm text-gray-500">Loading preview...</p>
            </div>
          </div>
        ) : previewUrl ? (
          <iframe
            src={previewUrl}
            className="w-full h-full rounded-xl border border-gray-200 bg-white shadow-sm"
            title="PDF Preview"
          />
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
