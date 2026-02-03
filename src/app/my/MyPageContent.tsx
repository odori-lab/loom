'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Database } from '@/types/database'

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
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Looms yet</h3>
          <p className="text-gray-500 mb-6">Create your first Loom from Threads posts</p>
          <Link
            href="/create"
            className="inline-flex px-4 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            Create Your First Loom
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 flex overflow-hidden">
      {/* Left Panel - Loom List */}
      <div className="w-1/2 border-r flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">My Looms</h1>
          <Link
            href="/create"
            className="px-3 py-1.5 bg-black text-white text-sm rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            + New
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {looms.map(loom => (
            <div
              key={loom.id}
              onClick={() => handleSelect(loom)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedLoom?.id === loom.id
                  ? 'border-black bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">
                    {loom.thread_display_name || `@${loom.thread_username}`}
                  </h3>
                  <p className="text-sm text-gray-500">@{loom.thread_username}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(loom.id)
                  }}
                  disabled={deletingId === loom.id}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  title="Delete"
                >
                  {deletingId === loom.id ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                <span>{loom.post_count} posts</span>
                <span>{formatDate(loom.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - Preview */}
      <div className="w-1/2 flex flex-col bg-gray-50">
        {selectedLoom ? (
          <>
            <div className="p-4 border-b bg-white flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">
                  {selectedLoom.thread_display_name || `@${selectedLoom.thread_username}`}
                </h2>
                <p className="text-sm text-gray-500">{selectedLoom.post_count} posts</p>
              </div>
              {previewUrl && (
                <button
                  onClick={() => handleDownload(previewUrl)}
                  className="px-3 py-1.5 bg-black text-white text-sm rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </button>
              )}
            </div>
            <div className="flex-1 p-4">
              {loadingPreview ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <svg className="w-8 h-8 animate-spin mx-auto text-gray-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-500">Loading preview...</p>
                  </div>
                </div>
              ) : previewUrl ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-full rounded-lg border bg-white"
                  title="PDF Preview"
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-gray-500">Failed to load preview</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-200 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <p className="text-gray-500">Select a Loom to preview</p>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
