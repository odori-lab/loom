'use client'

import { useState } from 'react'
import { LoomCard } from '@/components/loom/LoomCard'
import Link from 'next/link'
import { Database } from '@/types/database'

type Loom = Database['public']['Tables']['looms']['Row']

interface LoomListProps {
  initialLooms: Loom[]
}

export function LoomList({ initialLooms }: LoomListProps) {
  const [looms, setLooms] = useState(initialLooms)

  const handleDelete = (id: string) => {
    setLooms(prev => prev.filter(loom => loom.id !== id))
  }

  if (looms.length === 0) {
    return (
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
    )
  }

  return (
    <div className="space-y-4">
      {looms.map(loom => (
        <LoomCard
          key={loom.id}
          id={loom.id}
          threadUsername={loom.thread_username}
          threadDisplayName={loom.thread_display_name}
          postCount={loom.post_count}
          createdAt={loom.created_at}
          onDelete={handleDelete}
        />
      ))}
    </div>
  )
}
