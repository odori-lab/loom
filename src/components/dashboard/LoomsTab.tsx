'use client'

import { useState, useMemo } from 'react'
import { useDashboard } from './DashboardContext'
import { SpinnerSvg } from '@/components/ui/Spinner'
import { TrashIcon, PlusIcon, BookOpenIcon, SearchIcon, DownloadIcon } from '@/components/ui/Icons'

type SortOrder = 'newest' | 'oldest'

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function LoomsTab() {
  const { looms, selectedLoom, deletingId, selectLoom, deleteLoom, setActiveTab, openPreviewModal } = useDashboard()
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest')
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const filteredLooms = useMemo(() => {
    let result = [...looms]
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(l =>
        (l.thread_display_name || '').toLowerCase().includes(q) ||
        l.thread_username.toLowerCase().includes(q)
      )
    }
    return result.toSorted((a, b) => {
      const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      return sortOrder === 'newest' ? diff : -diff
    })
  }, [looms, searchQuery, sortOrder])

  const handleDownload = async (e: React.MouseEvent, loomId: string) => {
    e.stopPropagation()
    setDownloadingId(loomId)
    try {
      const res = await fetch(`/api/looms/${loomId}`)
      const data = await res.json()
      if (data.downloadUrl) {
        window.open(data.downloadUrl, '_blank')
      }
    } catch (error) {
      console.error('Download failed:', error)
    } finally {
      setDownloadingId(null)
    }
  }

  if (looms.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center py-16 px-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center shadow-sm">
            <BookOpenIcon className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Looms yet</h3>
          <p className="text-gray-500 mb-8 max-w-sm">
            Transform your Threads posts into beautiful PDFs
          </p>
          <button
            onClick={() => setActiveTab('create')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-full font-medium hover:bg-gray-800 hover:scale-105 transition-all shadow-lg shadow-gray-900/20"
          >
            <PlusIcon className="w-5 h-5" />
            Create Your First Loom
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Controls */}
      <div className="h-16 px-6 py-4 flex gap-4 items-center border-b border-gray-100">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-3 py-2 bg-gray-100 border-0 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-300 w-48 h-8"
          />
        </div>
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as SortOrder)}
          className="px-3 py-1 bg-gray-100 border-0 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-300 h-8"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
        </select>
        <p className="text-sm text-gray-500">{looms.length} {looms.length === 1 ? 'loom' : 'looms'}</p>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex flex-wrap gap-3">
          {filteredLooms.map(loom => (
            <div
              key={loom.id}
              onClick={() => selectLoom(loom)}
              className={`w-[170px] cursor-pointer rounded-xl border-2 transition-all overflow-hidden ${
                selectedLoom?.id === loom.id
                  ? 'border-gray-900 shadow-sm'
                  : 'border-transparent hover:border-gray-200'
              }`}
            >
              {/* Gradient thumbnail */}
              <div className="h-[110px] bg-gradient-to-br from-purple-400 via-pink-400 to-orange-300 relative">
                {/* Action buttons */}
                <div className="absolute top-1.5 right-1.5 flex gap-1">
                  <button
                    onClick={(e) => handleDownload(e, loom.id)}
                    disabled={downloadingId === loom.id}
                    className="p-1.5 bg-white/80 backdrop-blur-sm rounded-lg text-gray-500 hover:text-gray-900 hover:bg-white transition-all disabled:opacity-50"
                    title="Download"
                  >
                    {downloadingId === loom.id ? (
                      <SpinnerSvg />
                    ) : (
                      <DownloadIcon className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      selectLoom(loom)
                      openPreviewModal()
                    }}
                    className="p-1.5 bg-white/80 backdrop-blur-sm rounded-lg text-gray-500 hover:text-gray-900 hover:bg-white transition-all"
                    title="Preview"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteLoom(loom.id)
                    }}
                    disabled={deletingId === loom.id}
                    className="p-1.5 bg-white/80 backdrop-blur-sm rounded-lg text-gray-500 hover:text-red-500 hover:bg-white transition-all disabled:opacity-50"
                    title="Delete"
                  >
                    {deletingId === loom.id ? (
                      <SpinnerSvg />
                    ) : (
                      <TrashIcon className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
              {/* Info */}
              <div className="p-2.5 bg-white">
                <p className="text-xs font-medium text-gray-900 truncate">
                  {loom.thread_display_name || `@${loom.thread_username}`}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[10px] text-gray-500">{formatDate(loom.created_at)}</span>
                  <span className="inline-flex items-center px-1 py-0.5 bg-gray-100 rounded text-[10px] text-gray-500">
                    @{loom.thread_username}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
