'use client'

import { useState } from 'react'

interface UsernameStepProps {
  onSubmit: (username: string) => void
  loading: boolean
}

export function UsernameStep({ onSubmit, loading }: UsernameStepProps) {
  const [username, setUsername] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) return
    onSubmit(username.trim())
  }

  return (
    <div className="max-w-md mx-auto text-center">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Create a Loom</h1>
      <p className="text-gray-500 mb-8">
        Enter a Threads username to get started
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">@</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={!username.trim() || loading}
          className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading posts...
            </>
          ) : (
            'Continue'
          )}
        </button>
      </form>
    </div>
  )
}
