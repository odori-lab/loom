'use client'

import { useRef, useEffect } from 'react'
import { formatDate } from '@/lib/utils/format'
import { CheckIcon, HeartIcon, CommentIcon, RepostIcon, ShareIcon } from '@/components/ui/Icons'
import { Spinner } from '@/components/ui/Spinner'
import { useCreateFlow } from './CreateFlowContext'
import { SortOrder } from './CreateFlowContext'

interface PostListSidebarProps {
  className?: string
}

export function PostListSidebar({ className }: PostListSidebarProps) {
  const {
    state: { selectedIds, sortOrder, searchQuery, profile, loadingMore, hasMore },
    actions: { togglePost, toggleAll, setSortOrder, setSearchQuery, loadMorePosts },
    meta: { filteredAndSortedPosts },
  } = useCreateFlow()

  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Infinite scroll observer
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || loadingMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMorePosts()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, loadMorePosts])

  if (!profile) return null

  return (
    <div className={className ?? "w-80 border-l border-gray-200 flex flex-col bg-white"} style={{ animation: 'slideInLeft 0.35s ease-out both' }}>
      {/* Profile + Controls */}
      <div className="p-4 border-b border-gray-100 space-y-3">
        <div className="flex items-center gap-3">
          {profile.profileImageUrl ? (
            <img
              src={profile.profileImageUrl}
              alt=""
              className="w-9 h-9 rounded-full object-cover"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-sm font-bold text-white">
                {profile.username[0].toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 text-sm truncate">{profile.displayName}</p>
            <p className="text-xs text-gray-500">@{profile.username}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-gray-100 border-0 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-gray-300"
            />
          </div>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            className="px-2 py-1.5 bg-gray-100 border-0 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-gray-300"
          >
            <option value="newest">New</option>
            <option value="oldest">Old</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={toggleAll}
            className="text-xs text-gray-500 hover:text-gray-900 active:scale-[0.96]"
          >
            {selectedIds.size === filteredAndSortedPosts.length ? 'Deselect all' : 'Select all'}
          </button>
          <span className="text-xs text-gray-400">
            {filteredAndSortedPosts.length} posts
          </span>
        </div>
      </div>

      {/* Threads-style Post List */}
      <div className="flex-1 overflow-y-auto cf-scroll-fade">
        {filteredAndSortedPosts.map((post, index) => (
          <div
            key={post.id}
            onClick={() => togglePost(post.id)}
            className={`px-3 py-3 border-b border-gray-100 cursor-pointer transition-colors ${
              selectedIds.has(post.id)
                ? 'bg-gray-50'
                : 'hover:bg-gray-50/50'
            }`}
            style={{
              animation: `fadeInUp 0.3s ease-out ${Math.min(index * 35, 350)}ms both`,
              contentVisibility: 'auto',
            }}
          >
            {/* Grid layout like actual Threads UI */}
            <div className="grid gap-x-3" style={{ gridTemplateColumns: '36px 1fr' }}>
              {/* Profile Image - spans all rows */}
              <div className="row-span-full pt-0.5">
                {profile.profileImageUrl ? (
                  <img
                    src={profile.profileImageUrl}
                    alt=""
                    className="w-9 h-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <span className="text-sm font-bold text-white">
                      {profile.username[0].toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Header: Username + Time + Checkbox */}
              <div className="flex items-center gap-1.5 leading-[1.4]">
                <span className="text-[13px] font-semibold text-gray-900">
                  {profile.username}
                </span>
                <span className="text-[13px] text-gray-400">
                  {formatDate(new Date(post.postedAt))}
                </span>
                <div className="flex-1" />
                <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                  selectedIds.has(post.id)
                    ? 'bg-black border-black'
                    : 'border-gray-300'
                }`}>
                  {selectedIds.has(post.id) && (
                    <CheckIcon className="w-3 h-3 text-white" />
                  )}
                </div>
              </div>

              {/* Post Content */}
              <div className="mt-0.5">
                <p className="text-[13px] text-gray-900 leading-[1.4] line-clamp-3 whitespace-pre-line">
                  {post.content}
                </p>
              </div>

              {/* Image Preview - col 2 */}
              {post.imageUrls.length > 0 && (
                <div className="col-start-2 mt-2">
                  <div className="relative overflow-hidden rounded-xl" style={{ maxHeight: '120px' }}>
                    <img
                      src={post.imageUrls[0]}
                      alt=""
                      className="w-full h-auto object-cover rounded-xl transition-transform duration-200 hover:scale-[1.03]"
                      style={{ maxHeight: '120px' }}
                    />
                    {post.imageUrls.length > 1 && (
                      <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-md">
                        +{post.imageUrls.length - 1}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Engagement Stats - col 2 */}
              <div className="col-start-2 mt-2 flex items-center gap-3">
                <div className="flex items-center gap-1 text-gray-400">
                  <HeartIcon />
                  {post.likeCount > 0 && <span className="text-[11px]">{post.likeCount}</span>}
                </div>
                <div className="flex items-center gap-1 text-gray-400">
                  <CommentIcon />
                  {post.replyCount > 0 && <span className="text-[11px]">{post.replyCount}</span>}
                </div>
                <div className="flex items-center gap-1 text-gray-400">
                  <RepostIcon />
                  {post.repostCount > 0 && <span className="text-[11px]">{post.repostCount}</span>}
                </div>
                <div className="flex items-center text-gray-400">
                  <ShareIcon />
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Infinite scroll trigger */}
        {hasMore && (
          <div ref={loadMoreRef} className="p-6 flex items-center justify-center">
            {loadingMore ? (
              <Spinner size="md" className="text-gray-400" />
            ) : (
              <button
                onClick={loadMorePosts}
                className="text-sm text-gray-500 hover:text-gray-900 active:scale-[0.96]"
              >
                Load more posts
              </button>
            )}
          </div>
        )}

        {/* End of list */}
        {!hasMore && filteredAndSortedPosts.length > 0 && (
          <div className="p-4 text-center text-xs text-gray-400" style={{ animation: 'fadeIn 0.3s ease-out both' }}>
            All posts loaded
          </div>
        )}
      </div>
    </div>
  )
}
