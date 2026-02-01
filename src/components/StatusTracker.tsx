'use client'

import { useEffect, useState } from 'react'
import { DownloadButton } from './DownloadButton'

interface JobStatus {
  status: 'pending' | 'scraping' | 'generating_pdf' | 'completed' | 'failed'
  postCount: number
  pdfUrl?: string
  errorMessage?: string
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Preparing...',
  scraping: 'Scraping threads...',
  generating_pdf: 'Generating PDF...',
  completed: 'Done!',
  failed: 'Failed',
}

export function StatusTracker({ sessionId }: { sessionId: string }) {
  const [job, setJob] = useState<JobStatus | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!sessionId) return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/status/${sessionId}`)
        if (!res.ok) return
        const data = await res.json()
        setJob(data)

        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(interval)
        }
      } catch {
        setError('Failed to fetch status')
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [sessionId])

  if (error) return <p className="text-red-500">{error}</p>

  if (!job) {
    return (
      <div className="text-center space-y-3">
        <div className="animate-spin w-8 h-8 border-2 border-black border-t-transparent rounded-full mx-auto" />
        <p className="text-gray-500">Loading status...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 text-center">
      {job.status !== 'completed' && job.status !== 'failed' && (
        <div className="animate-spin w-8 h-8 border-2 border-black border-t-transparent rounded-full mx-auto" />
      )}

      <p className="text-lg font-medium">{STATUS_LABELS[job.status]}</p>

      {job.postCount > 0 && job.status === 'scraping' && (
        <p className="text-gray-500">{job.postCount} posts found</p>
      )}

      {job.status === 'failed' && (
        <div className="space-y-2">
          <p className="text-red-500 text-sm">{job.errorMessage || 'An error occurred'}</p>
          <p className="text-gray-400 text-xs">Your payment will be automatically refunded.</p>
        </div>
      )}

      {job.status === 'completed' && (
        <DownloadButton sessionId={sessionId} postCount={job.postCount} />
      )}
    </div>
  )
}
