'use client'

import { useState, useMemo } from 'react'
import { ThreadsPost, ThreadsProfile } from '@/types/threads'
import { generatePdfHtml } from '@/lib/pdf/generator'

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

  // 선택된 포스트들을 정렬하여 미리보기용으로 가져오기
  const selectedPosts = useMemo(() => {
    return posts
      .filter(p => selectedIds.has(p.id))
      .sort((a, b) => {
        const diff = new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
        return sortOrder === 'newest' ? diff : -diff
      })
  }, [posts, selectedIds, sortOrder])

  // 실제 PDF HTML 생성 (generatePdfHtml 사용)
  const pdfHtml = useMemo(() => {
    if (selectedPosts.length === 0) return ''
    return generatePdfHtml(selectedPosts, profile)
  }, [selectedPosts, profile])

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
    <div className="flex h-[calc(100vh-200px)] min-h-[600px]">
      {/* Left panel - Post selection */}
      <div className="w-1/2 border-r flex flex-col overflow-hidden">
        <div className="p-4 flex-shrink-0">
          {/* Profile header */}
          <div className="flex items-center gap-4 mb-4 p-3 bg-gray-50 rounded-xl">
            {profile.profileImageUrl ? (
              <img
                src={profile.profileImageUrl}
                alt=""
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <span className="text-lg font-bold text-white">
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
          <div className="space-y-3 mb-4">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
              />
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">From</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">To</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                />
              </div>
            </div>
          </div>

          {/* Select all */}
          <div className="flex items-center justify-between mb-3">
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
        </div>

        {/* Posts list */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          {filteredAndSortedPosts.map(post => (
            <div
              key={post.id}
              onClick={() => togglePost(post.id)}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
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
                  className="mt-0.5 w-4 h-4 rounded border-gray-300"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 line-clamp-2 whitespace-pre-wrap">
                    {post.content}
                  </p>
                  {post.imageUrls.length > 0 && (
                    <div className="flex gap-1.5 mt-1.5">
                      {post.imageUrls.slice(0, 2).map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          alt=""
                          className="w-12 h-12 object-cover rounded-lg"
                        />
                      ))}
                      {post.imageUrls.length > 2 && (
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-500">
                          +{post.imageUrls.length - 2}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                    <span>{formatDate(post.postedAt)}</span>
                    <span className="flex items-center gap-0.5">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      {formatNumber(post.likeCount)}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <div className="p-4 border-t flex gap-3 flex-shrink-0">
          <button
            onClick={onBack}
            className="flex-1 py-2.5 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleGenerate}
            disabled={selectedIds.size === 0 || loading}
            className="flex-1 py-2.5 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating...
              </>
            ) : (
              `Generate PDF (${selectedIds.size} posts)`
            )}
          </button>
        </div>
      </div>

      {/* Right panel - PDF Preview (실제 PDF HTML 렌더링) */}
      <div className="w-1/2 bg-gray-100 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b bg-white flex items-center justify-between flex-shrink-0">
          <h3 className="font-semibold text-gray-900">PDF Preview</h3>
          {selectedPosts.length > 0 && (
            <span className="text-sm text-gray-500">{selectedPosts.length} posts</span>
          )}
        </div>

        {/* PDF Preview using iframe */}
        <div className="flex-1 p-4">
          {selectedPosts.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-200 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <p className="text-gray-500">Select posts to preview PDF</p>
              </div>
            </div>
          ) : (
            <iframe
              srcDoc={pdfHtml}
              className="w-full h-full rounded-lg border bg-white shadow-lg"
              title="PDF Preview"
            />
          )}
        </div>
      </div>
    </div>
  )
}
