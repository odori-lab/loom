'use client'

import { useState } from 'react'

interface UsernameFormProps {
  onSubmit: (username: string) => void
  loading: boolean
  error: string
}

export function UsernameForm({ onSubmit, loading, error }: UsernameFormProps) {
  const [username, setUsername] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit(username.replace('@', ''))
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-gray-400 mb-1">
          Threads Username
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">@</span>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
            required
            className="w-full pl-8 pr-4 py-3 border border-gray-700 bg-gray-900 rounded-lg focus:ring-2 focus:ring-white focus:border-white outline-none"
          />
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading || !username}
        className="w-full py-3 bg-white text-black rounded-lg font-medium hover:bg-gray-200 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Fetching Posts...' : 'Next'}
      </button>
    </form>
  )
}
