'use client'

import { useCreateFlow } from './CreateFlowContext'

export function ErrorBanner({ className = '' }: { className?: string }) {
  const { state: { error } } = useCreateFlow()

  if (!error) return null

  return (
    <div
      className={`p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex items-center gap-3 ${className}`}
      style={{ animation: 'shake 0.4s ease-in-out, fadeInUp 0.3s ease-out both' }}
    >
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {error}
    </div>
  )
}
