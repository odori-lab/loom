'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { StatusTracker } from '@/components/StatusTracker'

function SuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id') || ''

  if (!sessionId) {
    return (
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Invalid session</h1>
        <a href="/" className="text-gray-500 underline">Go back home</a>
      </div>
    )
  }

  return (
    <div className="space-y-6 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Payment successful!</h1>
        <p className="text-gray-500">Your PDF is being generated.</p>
      </div>
      <StatusTracker sessionId={sessionId} />
    </div>
  )
}

export default function SuccessPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      <main className="w-full max-w-md">
        <Suspense fallback={<p className="text-center text-gray-400">Loading...</p>}>
          <SuccessContent />
        </Suspense>
      </main>
    </div>
  )
}
