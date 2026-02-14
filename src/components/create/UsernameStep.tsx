'use client'

import { useState } from 'react'
import { Spinner } from '@/components/ui/Spinner'
import { ArrowRightIcon } from '@/components/ui/Icons'
import { useCreateFlow } from './CreateFlowContext'

export function UsernameStep() {
  const { state: { loading, error }, actions: { submitUsername } } = useCreateFlow()
  const [username, setUsername] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) return
    submitUsername(username.trim())
  }

  return (
    <div className="max-w-md mx-auto text-center" style={{ animation: 'fadeInUp 0.5s ease-out both' }}>
      <div className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>

      <h1 className="text-4xl font-bold text-gray-900 mb-3" style={{ animation: 'fadeInUp 0.5s ease-out 0.08s both' }}>Create a Loom</h1>
      <p className="text-lg text-gray-500 mb-10" style={{ animation: 'fadeInUp 0.5s ease-out 0.16s both' }}>
        Enter a Threads username to get started
      </p>

      <form onSubmit={handleSubmit} className="space-y-4" style={{ animation: 'fadeInUp 0.5s ease-out 0.24s both' }}>
        <div className="relative" style={error ? { animation: 'shake 0.4s ease-in-out' } : undefined}>
          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 text-lg font-medium">@</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
            className="w-full pl-12 pr-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:outline-none focus:border-gray-900 focus:bg-white text-lg transition-all"
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={!username.trim() || loading}
          className="w-full py-4 bg-gray-900 text-white rounded-2xl font-medium text-lg hover:bg-gray-800 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-3 shadow-lg shadow-gray-900/20 relative overflow-hidden active:scale-[0.96]"
        >
          {loading && (
            <div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent"
              style={{ animation: 'shimmer 1.5s infinite linear', backgroundSize: '200% 100%' }}
            />
          )}
          {loading ? (
            <>
              <Spinner size="md" className="text-white" />
              Loading posts...
            </>
          ) : (
            <>
              Continue
              <ArrowRightIcon />
            </>
          )}
        </button>
      </form>

      <p className="mt-8 text-sm text-gray-400" style={{ animation: 'fadeInUp 0.5s ease-out 0.32s both' }}>
        We'll fetch the latest posts from this Threads profile
      </p>
    </div>
  )
}
