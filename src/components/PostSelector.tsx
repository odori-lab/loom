'use client'

import { useMemo, useState } from 'react'
import { ThreadsPost } from '@/types/threads-post'

interface PostSelectorProps {
  posts: ThreadsPost[]
  username: string
  onGeneratePdf: (selectedPosts: ThreadsPost[]) => void
  loading: boolean
}

export function PostSelector({ posts, username, onGeneratePdf, loading }: PostSelectorProps) {
  const [selectedPosts, setSelectedPosts] = useState<string[]>(posts.map((p) => p.id))
  const [searchQuery, setSearchQuery] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const postDate = new Date(post.postedAt)
      const start = startDate ? new Date(startDate) : null
      const end = endDate ? new Date(endDate) : null

      if (start && postDate < start) return false
      if (end && postDate > end) return false
      if (searchQuery && !post.content.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      return true
    })
  }, [posts, searchQuery, startDate, endDate])

  function togglePost(postId: string) {
    setSelectedPosts((prev) =>
      prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId]
    )
  }

  function toggleSelectAll() {
    if (selectedPosts.length === filteredPosts.length) {
      setSelectedPosts([])
    } else {
      setSelectedPosts(filteredPosts.map((p) => p.id))
    }
  }

  const selectedPostObjects = posts.filter((p) => selectedPosts.includes(p.id))

  return (
    <div className="w-full max-w-lg space-y-4 text-left">
      <div className="flex justify-between items-center pb-2 border-b border-gray-800">
        <h2 className="text-xl font-bold">Select Posts for @{username}</h2>
        <button
          onClick={toggleSelectAll}
          className="text-sm font-medium text-gray-400 hover:text-white"
        >
          {selectedPosts.length === filteredPosts.length ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      <div className="space-y-2">
        <input
          type="text"
          placeholder="Search posts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-gray-700 bg-gray-900 rounded-lg outline-none"
        />
        <div className="flex gap-2">
          <input
            type="date"
            placeholder="Start date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-4 py-2 border border-gray-700 bg-gray-900 rounded-lg outline-none"
          />
          <input
            type="date"
            placeholder="End date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-4 py-2 border border-gray-700 bg-gray-900 rounded-lg outline-none"
          />
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto space-y-3 pr-2">
        {filteredPosts.map((post) => (
          <div
            key={post.id}
            onClick={() => togglePost(post.id)}
            className="p-4 rounded-lg bg-gray-900 border border-gray-800 cursor-pointer flex items-start gap-4"
          >
            <input
              type="checkbox"
              checked={selectedPosts.includes(post.id)}
              readOnly
              className="mt-1 accent-white"
            />
            <div>
              <p className="text-gray-300">{post.content}</p>
              <span className="text-xs text-gray-500">
                {new Date(post.postedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => onGeneratePdf(selectedPostObjects)}
        disabled={selectedPosts.length === 0 || loading}
        className="w-full py-3 bg-white text-black rounded-lg font-medium hover:bg-gray-200 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Generating PDF...' : `Generate PDF (${selectedPosts.length} posts)`}
      </button>
    </div>
  )
}
