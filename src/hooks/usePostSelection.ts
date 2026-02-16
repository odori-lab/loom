'use client'

import { useState, useMemo, useCallback } from 'react'
import { ThreadsPost } from '@/types/threads'
import { BookStructure } from '@/types/book'
import { SortOrder } from '@/components/create/CreateFlowContext'

export function usePostSelection(
  posts: ThreadsPost[],
  bookStructure: BookStructure | null,
  initialSelectedIds?: Set<string>,
) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => initialSelectedIds ?? new Set()
  )
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest')
  const [searchQuery, setSearchQuery] = useState('')
  const [displayLimit, setDisplayLimit] = useState(10)
  const [loadingMore, setLoadingMore] = useState(false)

  const filteredAndSortedPosts = useMemo(() => {
    let result = [...posts]

    if (searchQuery) {
      result = result.filter(p =>
        p.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    const sorted = result.toSorted((a, b) => {
      const diff = new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
      return sortOrder === 'newest' ? diff : -diff
    })

    return sorted.slice(0, displayLimit)
  }, [posts, searchQuery, sortOrder, displayLimit])

  const selectedPosts = useMemo(() => {
    return posts
      .filter(p => selectedIds.has(p.id))
      .toSorted((a, b) => {
        const diff = new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
        return sortOrder === 'newest' ? diff : -diff
      })
  }, [posts, selectedIds, sortOrder])

  // Posts ordered by book structure chapters
  const orderedPosts = useMemo(() => {
    if (!bookStructure) return selectedPosts
    const postMap = new Map(posts.map(p => [p.id, p]))
    const ordered: ThreadsPost[] = []
    for (const chapter of bookStructure.chapters) {
      for (const subChapter of chapter.subChapters) {
        for (const postId of subChapter.postIds) {
          const post = postMap.get(postId)
          if (post && selectedIds.has(postId)) {
            ordered.push(post)
          }
        }
      }
    }
    return ordered
  }, [bookStructure, posts, selectedIds, selectedPosts])

  const togglePost = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    setSelectedIds(prev => {
      const visibleIds = filteredAndSortedPosts.map(p => p.id)
      const allVisibleSelected = visibleIds.every(id => prev.has(id))
      if (allVisibleSelected) {
        const next = new Set(prev)
        visibleIds.forEach(id => next.delete(id))
        return next
      }
      const next = new Set(prev)
      visibleIds.forEach(id => next.add(id))
      return next
    })
  }, [filteredAndSortedPosts])

  const loadMorePosts = useCallback(() => {
    if (displayLimit >= posts.length) return

    setLoadingMore(true)

    setTimeout(() => {
      const newPosts = posts.slice(displayLimit, displayLimit + 10)
      setSelectedIds(prev => {
        const next = new Set(prev)
        newPosts.forEach(p => next.add(p.id))
        return next
      })
      setDisplayLimit(prev => Math.min(prev + 10, posts.length))
      setLoadingMore(false)
    }, 300)
  }, [displayLimit, posts])

  const hasMore = displayLimit < posts.length

  return {
    selectedIds, setSelectedIds, sortOrder, setSortOrder,
    searchQuery, setSearchQuery, loadingMore, hasMore,
    filteredAndSortedPosts, selectedPosts, orderedPosts,
    togglePost, toggleAll, loadMorePosts, displayLimit, setDisplayLimit,
  }
}
