'use client'

import { useState } from 'react'
import { SpinnerSvg } from '@/components/ui/Spinner'
import { DownloadIcon, TrashIcon } from '@/components/ui/Icons'

interface LoomCardProps {
  id: string
  threadUsername: string
  threadDisplayName: string | null
  postCount: number
  createdAt: string
  onDelete?: (id: string) => void
}

export function LoomCard({
  id,
  threadUsername,
  threadDisplayName,
  postCount,
  createdAt,
  onDelete
}: LoomCardProps) {
  const [downloading, setDownloading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const res = await fetch(`/api/looms/${id}`)
      const data = await res.json()
      if (data.downloadUrl) {
        window.open(data.downloadUrl, '_blank')
      }
    } catch (error) {
      console.error('Download failed:', error)
    } finally {
      setDownloading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this Loom?')) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/looms/${id}`, { method: 'DELETE' })
      if (res.ok && onDelete) {
        onDelete(id)
      }
    } catch (error) {
      console.error('Delete failed:', error)
    } finally {
      setDeleting(false)
    }
  }

  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })

  return (
    <div className="border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">
            {threadDisplayName || `@${threadUsername}`}
          </h3>
          <p className="text-sm text-gray-500">@{threadUsername}</p>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            title="Download"
          >
            {downloading ? <SpinnerSvg /> : <DownloadIcon />}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            title="Delete"
          >
            {deleting ? <SpinnerSvg /> : <TrashIcon />}
          </button>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
        <span>{postCount} posts</span>
        <span>{formattedDate}</span>
      </div>
    </div>
  )
}
