'use client'

import { useRef, useEffect, useState } from 'react'
import { formatDate } from '@/lib/utils/format'
import { CheckIcon, HeartIcon, SearchIcon } from '@/components/ui/Icons'
import { Spinner } from '@/components/ui/Spinner'
import { useCreateFlow } from './CreateFlowContext'
import { SortOrder } from './CreateFlowContext'
import { useI18n } from '@/lib/i18n/context'

interface PostListSidebarProps {
  className?: string
}

function proxyImageUrl(url: string): string {
  return `/api/proxy-image?url=${encodeURIComponent(url)}`
}

export function PostListSidebar({ className }: PostListSidebarProps) {
  const {
    state: { selectedIds, sortOrder, searchQuery, profile, loadingMore, hasMore },
    actions: { togglePost, toggleAll, setSortOrder, setSearchQuery, loadMorePosts },
    meta: { filteredAndSortedPosts },
  } = useCreateFlow()
  const { t } = useI18n()

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
      {/* Profile + Search + Sort — single horizontal bar */}
      <div className="h-12 px-4 flex justify-between items-center gap-3 border-b border-gray-100">
        {/* Profile avatar + name */}
        <div className="flex items-center gap-2 shrink-0">
          {profile.profileImageUrl ? (
            <img
              src={proxyImageUrl(profile.profileImageUrl)}
              alt=""
              className="w-7 h-7 rounded-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
                e.currentTarget.nextElementSibling?.classList.remove('hidden')
              }}
            />
          ) : null}
          <div className={`w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0 ${profile.profileImageUrl ? 'hidden' : ''}`}>
            <span className="text-xs font-bold text-white">
              {profile.username[0].toUpperCase()}
            </span>
          </div>
          <span className="text-sm font-medium text-gray-900 truncate max-w-[80px]">
            @{profile.username}
          </span>
        </div>

        <div className='flex gap-3'>
          {/* Sort selector — matches LoomsTab styling */}
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            className="px-2 py-1 bg-gray-100 border-0 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-gray-300 h-7 shrink-0"
          >
            <option value="newest">{t('create.posts.new')}</option>
            <option value="oldest">{t('create.posts.old')}</option>
          </select>

          {/* Search input — matches LoomsTab styling */}
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder={t('create.posts.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 bg-gray-100 border-0 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-gray-300 w-40 h-7"
            />
          </div>
        </div>
      </div>

      {/* Select all / count bar */}
      <div className="px-4 py-2 flex items-center justify-between border-b border-gray-100">
        <button
          onClick={toggleAll}
          className="text-xs text-gray-500 hover:text-gray-900 active:scale-[0.96]"
        >
          {filteredAndSortedPosts.every(p => selectedIds.has(p.id)) ? t('create.posts.deselectAll') : t('create.posts.selectAll')}
        </button>
        <span className="text-xs text-gray-400">
          {filteredAndSortedPosts.length} {t('create.posts.posts')}
        </span>
      </div>

      {/* Simplified Post List */}
      <div className="flex-1 overflow-y-auto cf-scroll-fade">
        {filteredAndSortedPosts.map((post, index) => (
          <PostItem
            key={post.id}
            post={post}
            index={index}
            isSelected={selectedIds.has(post.id)}
            onToggle={() => togglePost(post.id)}
          />
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
                {t('create.posts.loadMore')}
              </button>
            )}
          </div>
        )}

        {/* End of list */}
        {!hasMore && filteredAndSortedPosts.length > 0 && (
          <div className="p-4 text-center text-xs text-gray-400" style={{ animation: 'fadeIn 0.3s ease-out both' }}>
            {t('create.posts.allLoaded')}
          </div>
        )}
      </div>
    </div>
  )
}

function PostItem({
  post,
  index,
  isSelected,
  onToggle,
}: {
  post: import('@/types/threads').ThreadsPost
  index: number
  isSelected: boolean
  onToggle: () => void
}) {
  const [imgError, setImgError] = useState(false)

  return (
    <div
      onClick={onToggle}
      className={`px-4 py-3 cursor-pointer transition-colors border-b border-gray-100 ${
        isSelected ? 'bg-gray-50' : 'hover:bg-gray-50/50'
      }`}
      style={{
        animation: `fadeInUp 0.3s ease-out ${Math.min(index * 35, 350)}ms both`,
        contentVisibility: 'auto',
      }}
    >
      <div className="flex items-start gap-3">
        {/* Content area */}
        <div className="flex-1 min-w-0">
          {/* Date */}
          <p className="text-[11px] text-gray-400 mb-1">
            {formatDate(new Date(post.postedAt))}
          </p>

          {/* Content text */}
          <p className="text-[13px] text-gray-900 leading-[1.4] line-clamp-3 whitespace-pre-line">
            {post.content}
          </p>

          {/* Image previews */}
          {post.imageUrls.length > 0 && !imgError && (
            <div className="mt-2 flex gap-1.5 items-start overflow-x-auto">
              {post.imageUrls.map((url, i) => (
                <div key={i} className="rounded-lg bg-gray-50">
                  <img
                    src={proxyImageUrl(url)}
                    alt=""
                    className="w-full rounded-lg object-contain"
                    style={{ maxHeight: '80px' }}
                    onError={() => setImgError(true)}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Like count only */}
          {post.likeCount > 0 && (
            <div className="mt-1.5 flex items-center gap-1 text-gray-400">
              <HeartIcon className="w-3.5 h-3.5" />
              <span className="text-[11px]">{post.likeCount}</span>
            </div>
          )}
        </div>

        {/* Selection checkbox */}
        <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors mt-0.5 ${
          isSelected ? 'bg-black border-black' : 'border-gray-300'
        }`}>
          {isSelected && (
            <CheckIcon className="w-3 h-3 text-white" />
          )}
        </div>
      </div>
    </div>
  )
}
