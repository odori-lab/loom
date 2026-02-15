'use client'

import { useState } from 'react'
import { useCreateFlow } from './CreateFlowContext'
import { useI18n } from '@/lib/i18n/context'
import { BookChapter, BookSubChapter } from '@/types/book'
import { ThreadsPost } from '@/types/threads'

interface TOCSidebarProps {
  className?: string
}

function proxyImageUrl(url: string): string {
  return `/api/proxy-image?url=${encodeURIComponent(url)}`
}

export function TOCSidebar({ className }: TOCSidebarProps) {
  const {
    state: { bookStructure, organizing, profile, posts },
    actions: { regenerateStructure, generateLoom, goBack },
    meta: { orderedPosts },
  } = useCreateFlow()
  const { t } = useI18n()

  if (!profile) return null

  const totalSubChapters = bookStructure
    ? bookStructure.chapters.reduce((sum, ch) => sum + ch.subChapters.length, 0)
    : 0

  return (
    <div
      className={className ?? "w-80 border-l border-gray-200 flex flex-col bg-white"}
      style={{ animation: 'slideInLeft 0.35s ease-out both' }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-2">
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
          <span className="text-sm font-medium text-gray-900 truncate">
            @{profile.username}
          </span>
        </div>

        {/* Book title */}
        {bookStructure && !organizing && (
          <h2 className="text-base font-semibold text-gray-900 leading-tight mb-1" style={{ animation: 'fadeIn 0.3s ease-out both' }}>
            {bookStructure.title}
          </h2>
        )}

        {/* Actions row */}
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={goBack}
            className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors active:scale-[0.96]"
          >
            {t('create.organize.back')}
          </button>
          <button
            onClick={regenerateStructure}
            disabled={organizing}
            className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors active:scale-[0.96] disabled:opacity-50"
          >
            {organizing ? t('create.organize.organizing') : t('create.organize.regenerate')}
          </button>
          <div className="flex-1" />
          <button
            onClick={generateLoom}
            disabled={organizing || orderedPosts.length === 0}
            className="px-4 py-1.5 text-xs font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors active:scale-[0.96] disabled:opacity-50"
          >
            {t('create.organize.generate')}
          </button>
        </div>
      </div>

      {/* Post count bar */}
      <div className="px-4 py-2 flex items-center justify-between border-b border-gray-100">
        <span className="text-xs text-gray-400">
          {bookStructure
            ? `${bookStructure.chapters.length} ${t('create.organize.chapters')} · ${totalSubChapters} ${t('create.organize.subChapters')}`
            : ''}
        </span>
        <span className="text-xs text-gray-400">
          {orderedPosts.length} {t('create.posts.posts')}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto cf-scroll-fade">
        {organizing ? (
          <ShimmerLoading />
        ) : bookStructure ? (
          <ChapterList
            chapters={bookStructure.chapters}
            posts={posts}
          />
        ) : (
          <div className="p-8 text-center text-sm text-gray-400">
            {t('create.organize.noStructure')}
          </div>
        )}
      </div>
    </div>
  )
}

function ShimmerLoading() {
  return (
    <div className="p-4 space-y-4" style={{ animation: 'fadeIn 0.3s ease-out both' }}>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="space-y-2" style={{ animationDelay: `${i * 100}ms` }}>
          <div className="h-5 bg-gray-100 rounded-lg animate-shimmer w-3/4" />
          <div className="h-3 bg-gray-50 rounded-lg animate-shimmer w-1/2" />
          <div className="space-y-1.5 pl-3 mt-2">
            {[...Array(3)].map((_, j) => (
              <div key={j} className="h-3 bg-gray-50 rounded animate-shimmer" style={{ width: `${85 - j * 10}%` }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function ChapterList({ chapters, posts }: { chapters: BookChapter[]; posts: ThreadsPost[] }) {
  const postMap = new Map(posts.map(p => [p.id, p]))

  return (
    <div>
      {chapters.map((chapter, index) => (
        <ChapterItem
          key={chapter.id}
          chapter={chapter}
          index={index}
          postMap={postMap}
        />
      ))}
    </div>
  )
}

function ChapterItem({
  chapter,
  index,
  postMap,
}: {
  chapter: BookChapter
  index: number
  postMap: Map<string, ThreadsPost>
}) {
  const [expanded, setExpanded] = useState(index === 0)

  const totalPosts = chapter.subChapters.reduce((sum, sc) => sum + sc.postIds.length, 0)

  return (
    <div
      className="border-b border-gray-100"
      style={{ animation: `fadeInUp 0.3s ease-out ${Math.min(index * 50, 250)}ms both` }}
    >
      {/* Chapter header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-50/50 transition-colors text-left active:scale-[0.99]"
      >
        <span className="text-xs font-mono text-gray-400 mt-0.5 shrink-0 w-5 text-center">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-gray-900 leading-tight">
            {chapter.title}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {chapter.description} · {chapter.subChapters.length} sub · {totalPosts} posts
          </p>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 shrink-0 mt-0.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Sub-chapters */}
      {expanded && (
        <div className="pb-2" style={{ animation: 'fadeIn 0.2s ease-out both' }}>
          {chapter.subChapters.map((subChapter, scIdx) => (
            <SubChapterItem
              key={subChapter.id}
              subChapter={subChapter}
              chapterIndex={index}
              subIndex={scIdx}
              postMap={postMap}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SubChapterItem({
  subChapter,
  chapterIndex,
  subIndex,
  postMap,
}: {
  subChapter: BookSubChapter
  chapterIndex: number
  subIndex: number
  postMap: Map<string, ThreadsPost>
}) {
  const [expanded, setExpanded] = useState(false)

  const subPosts = subChapter.postIds
    .map(id => postMap.get(id))
    .filter((p): p is ThreadsPost => p !== undefined)

  return (
    <div style={{ animation: `fadeIn 0.2s ease-out ${subIndex * 30}ms both` }}>
      {/* Sub-chapter header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full pl-12 pr-4 py-2 flex items-start gap-2 hover:bg-gray-50/30 transition-colors text-left active:scale-[0.99]"
      >
        <span className="text-[10px] font-mono text-gray-300 mt-0.5 shrink-0 w-6 text-center">
          {chapterIndex + 1}.{subIndex + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-medium text-gray-700 leading-tight">
            {subChapter.title}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {subPosts.length} posts
          </p>
        </div>
        <svg
          className={`w-3 h-3 text-gray-300 shrink-0 mt-0.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Post previews */}
      {expanded && (
        <div className="pb-1" style={{ animation: 'fadeIn 0.15s ease-out both' }}>
          {subPosts.map((post, postIdx) => (
            <div
              key={post.id}
              className="pl-20 pr-4 py-1"
              style={{ animation: `fadeIn 0.15s ease-out ${postIdx * 20}ms both` }}
            >
              <p className="text-[11px] text-gray-500 leading-[1.4] line-clamp-2 whitespace-pre-line">
                {post.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
