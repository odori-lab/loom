'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Database } from '@/types/database'
import { SpinnerSvg } from '@/components/ui/Spinner'
import { DownloadIcon, TrashIcon, PlusIcon, BookOpenIcon } from '@/components/ui/Icons'

type Loom = Database['public']['Tables']['looms']['Row']

interface MyPageContentProps {
  initialLooms: Loom[]
}

export function MyPageContent({ initialLooms }: MyPageContentProps) {
  const [looms, setLooms] = useState(initialLooms)
  const [selectedLoom, setSelectedLoom] = useState<Loom | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleSelect = async (loom: Loom) => {
    setSelectedLoom(loom)
    setLoadingPreview(true)
    setPreviewUrl(null)

    try {
      const res = await fetch(`/api/looms/${loom.id}`)
      const data = await res.json()
      if (data.downloadUrl) {
        setPreviewUrl(data.downloadUrl)
      }
    } catch (error) {
      console.error('Failed to load preview:', error)
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Loom?')) return

    setDeletingId(id)
    try {
      const res = await fetch(`/api/looms/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setLooms(prev => prev.filter(loom => loom.id !== id))
        if (selectedLoom?.id === id) {
          setSelectedLoom(null)
          setPreviewUrl(null)
        }
      }
    } catch (error) {
      console.error('Delete failed:', error)
    } finally {
      setDeletingId(null)
    }
  }

  const handleDownload = (url: string) => {
    window.open(url, '_blank')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (looms.length === 0) {
    return (
      <main className="flex-1 flex items-center justify-center bg-gradient-to-b from-gray-50 to-white">
        <div className="text-center py-16 px-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center shadow-sm">
            <BookOpenIcon className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Looms yet</h3>
          <p className="text-gray-500 mb-8 max-w-sm">
            Transform your Threads posts into beautiful PDFs
          </p>
          <Link
            href="/create"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-full font-medium hover:bg-gray-800 hover:scale-105 transition-all shadow-lg shadow-gray-900/20"
          >
            <PlusIcon className="w-5 h-5" />
            Create Your First Loom
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 flex overflow-hidden">
      {/* Left Panel - Loom List */}
      <div className="w-1/2 border-r border-gray-100 flex flex-col bg-white">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">My Looms</h1>
            <p className="text-sm text-gray-500 mt-0.5">{looms.length} {looms.length === 1 ? 'loom' : 'looms'}</p>
          </div>
          <Link
            href="/create"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-full font-medium hover:bg-gray-800 transition-all shadow-sm"
          >
            <PlusIcon />
            New Loom
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {looms.map(loom => (
            <div
              key={loom.id}
              onClick={() => handleSelect(loom)}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                selectedLoom?.id === loom.id
                  ? 'border-gray-900 bg-gray-50 shadow-sm'
                  : 'border-transparent bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-white">
                      {(loom.thread_display_name || loom.thread_username)?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {loom.thread_display_name || `@${loom.thread_username}`}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">@{loom.thread_username}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(loom.id)
                  }}
                  disabled={deletingId === loom.id}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all disabled:opacity-50"
                  title="Delete"
                >
                  {deletingId === loom.id ? (
                    <SpinnerSvg />
                  ) : (
                    <TrashIcon />
                  )}
                </button>
              </div>
              <div className="mt-3 flex items-center gap-4">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-full text-xs font-medium text-gray-600 shadow-sm">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {loom.post_count} posts
                </span>
                <span className="text-xs text-gray-400">{formatDate(loom.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - Preview */}
      <div className="w-1/2 flex flex-col bg-gradient-to-b from-gray-50 to-gray-100">
        {selectedLoom ? (
          <>
            <div className="p-5 border-b border-gray-200 bg-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <span className="text-sm font-bold text-white">
                    {(selectedLoom.thread_display_name || selectedLoom.thread_username)?.[0]?.toUpperCase() || '?'}
                  </span>
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">
                    {selectedLoom.thread_display_name || `@${selectedLoom.thread_username}`}
                  </h2>
                  <p className="text-sm text-gray-500">{selectedLoom.post_count} posts included</p>
                </div>
              </div>
              {previewUrl && (
                <button
                  onClick={() => handleDownload(previewUrl)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-full font-medium hover:bg-gray-800 transition-all shadow-sm"
                >
                  <DownloadIcon className="w-4 h-4" />
                  Download PDF
                </button>
              )}
            </div>
            <div className="flex-1 p-6">
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
                  className="w-full h-full rounded-2xl border border-gray-200 bg-white shadow-lg"
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
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gray-200/50 flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">Select a Loom to preview</p>
              <p className="text-sm text-gray-400 mt-1">Click on any item from the list</p>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
