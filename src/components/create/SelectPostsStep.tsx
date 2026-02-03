'use client'

import { useState, useMemo } from 'react'
import { ThreadsPost, ThreadsProfile } from '@/types/threads'

interface SelectPostsStepProps {
  posts: ThreadsPost[]
  profile: ThreadsProfile
  onGenerate: (posts: ThreadsPost[]) => void
  onBack: () => void
  loading: boolean
}

type SortOrder = 'newest' | 'oldest'

export function SelectPostsStep({
  posts,
  profile,
  onGenerate,
  onBack,
  loading
}: SelectPostsStepProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(posts.map(p => p.id))
  )
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  })

  const filteredAndSortedPosts = useMemo(() => {
    let result = [...posts]

    // Filter by search
    if (searchQuery) {
      result = result.filter(p =>
        p.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filter by date range
    if (dateRange.start) {
      const startDate = new Date(dateRange.start)
      result = result.filter(p => new Date(p.postedAt) >= startDate)
    }
    if (dateRange.end) {
      const endDate = new Date(dateRange.end)
      endDate.setHours(23, 59, 59, 999)
      result = result.filter(p => new Date(p.postedAt) <= endDate)
    }

    // Sort
    result.sort((a, b) => {
      const diff = new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
      return sortOrder === 'newest' ? diff : -diff
    })

    return result
  }, [posts, searchQuery, dateRange, sortOrder])

  const togglePost = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const toggleAll = () => {
    if (selectedIds.size === filteredAndSortedPosts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredAndSortedPosts.map(p => p.id)))
    }
  }

  const handleGenerate = () => {
    const selectedPosts = posts
      .filter(p => selectedIds.has(p.id))
      .sort((a, b) => {
        const diff = new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
        return sortOrder === 'newest' ? diff : -diff
      })
    onGenerate(selectedPosts)
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  return (
    <div>
      {/* Profile header */}
      <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
        {profile.profileImageUrl ? (
          <img
            src={profile.profileImageUrl}
            alt=""
            className="w-14 h-14 rounded-full object-cover"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <span className="text-xl font-bold text-white">
              {profile.username[0].toUpperCase()}
            </span>
          </div>
        )}
        <div>
          <h2 className="font-semibold text-gray-900">{profile.displayName}</h2>
          <p className="text-sm text-gray-500">@{profile.username}</p>
          {profile.followerCount > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">
              {formatNumber(profile.followerCount)} followers
            </p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-4 mb-6">
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
          />
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
            />
          </div>
        </div>
      </div>

      {/* Select all */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={toggleAll}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          {selectedIds.size === filteredAndSortedPosts.length ? 'Deselect all' : 'Select all'}
        </button>
        <span className="text-sm text-gray-500">
          {selectedIds.size} selected
        </span>
      </div>

      {/* Posts list */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto mb-6">
        {filteredAndSortedPosts.map(post => (
          <div
            key={post.id}
            onClick={() => togglePost(post.id)}
            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
              selectedIds.has(post.id)
                ? 'border-black bg-gray-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={selectedIds.has(post.id)}
                onChange={() => togglePost(post.id)}
                className="mt-1 w-4 h-4 rounded border-gray-300"
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 line-clamp-3 whitespace-pre-wrap">
                  {post.content}
                </p>
                {post.imageUrls.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {post.imageUrls.slice(0, 2).map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt=""
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    ))}
                    {post.imageUrls.length > 2 && (
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-sm text-gray-500">
                        +{post.imageUrls.length - 2}
                      </div>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span>{formatDate(post.postedAt)}</span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    {formatNumber(post.likeCount)}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    {formatNumber(post.replyCount)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-4">
        <button
          onClick={onBack}
          className="flex-1 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleGenerate}
          disabled={selectedIds.size === 0 || loading}
          className="flex-1 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating PDF...
            </>
          ) : (
            `Generate PDF (${selectedIds.size} posts)`
          )}
        </button>
      </div>
    </div>
  )
}
