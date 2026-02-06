'use client'

import { useState, useMemo } from 'react'
import { ThreadsPost, ThreadsProfile } from '@/types/threads'
import { generatePageContents } from '@/lib/pdf/generator'
import { calculateSpreads } from '@/lib/pdf/spreads'
import { BookPreview } from './BookPreview'
import { PostListSidebar } from './PostListSidebar'

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
  const [currentSpread, setCurrentSpread] = useState(0)

  const filteredAndSortedPosts = useMemo(() => {
    let result = [...posts]

    if (searchQuery) {
      result = result.filter(p =>
        p.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    result.sort((a, b) => {
      const diff = new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
      return sortOrder === 'newest' ? diff : -diff
    })

    return result
  }, [posts, searchQuery, sortOrder])

  const selectedPosts = useMemo(() => {
    return posts
      .filter(p => selectedIds.has(p.id))
      .sort((a, b) => {
        const diff = new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
        return sortOrder === 'newest' ? diff : -diff
      })
  }, [posts, selectedIds, sortOrder])

  const pages = useMemo(() => {
    if (selectedPosts.length === 0) return []
    return generatePageContents(selectedPosts, profile)
  }, [selectedPosts, profile])

  const spreads = useMemo(() => calculateSpreads(pages), [pages])

  const togglePost = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
    setCurrentSpread(0)
  }

  const toggleAll = () => {
    if (selectedIds.size === filteredAndSortedPosts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredAndSortedPosts.map(p => p.id)))
    }
    setCurrentSpread(0)
  }

  return (
    <div className="flex h-full">
      <BookPreview
        pages={pages}
        spreads={spreads}
        currentSpread={currentSpread}
        totalSpreads={spreads.length}
        currentSpreadData={spreads[currentSpread]}
        selectedCount={selectedIds.size}
        loading={loading}
        onPrevSpread={() => setCurrentSpread(prev => Math.max(0, prev - 1))}
        onNextSpread={() => setCurrentSpread(prev => Math.min(spreads.length - 1, prev + 1))}
        onBack={onBack}
        onGenerate={() => onGenerate(selectedPosts)}
      />
      <PostListSidebar
        profile={profile}
        filteredPosts={filteredAndSortedPosts}
        selectedIds={selectedIds}
        sortOrder={sortOrder}
        searchQuery={searchQuery}
        onTogglePost={togglePost}
        onToggleAll={toggleAll}
        onSortChange={setSortOrder}
        onSearchChange={setSearchQuery}
      />
    </div>
  )
}
