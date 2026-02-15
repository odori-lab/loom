'use client'

import { useState, useMemo, useCallback, ReactNode } from 'react'
import { ThreadsPost, ThreadsProfile } from '@/types/threads'
import { BookStructure } from '@/types/book'
import { generatePageContents } from '@/lib/pdf/generator'
import { calculateSpreads } from '@/lib/pdf/spreads'
import { scrapeThreadsDirect, createLoomDirect } from '@/lib/worker-client'
import { createClient } from '@/lib/supabase/client'
import {
  CreateFlowContext,
  CreateFlowContextValue,
  Step,
  SortOrder,
} from './CreateFlowContext'
import { MOCK_PROFILE, MOCK_POSTS, MOCK_BOOK_STRUCTURE } from '@/lib/mockdata'
import { Database } from '@/types/database'

type Loom = Database['public']['Tables']['looms']['Row']

const USE_MOCK_DATA = true
const STEPS = ['username', 'organize', 'complete'] as const

interface CreateFlowProviderProps {
  children: ReactNode
  onComplete?: (loom: Loom) => void
}

export function CreateFlowProvider({ children, onComplete }: CreateFlowProviderProps) {
  // Core state
  const [step, setStep] = useState<Step>(USE_MOCK_DATA ? 'organize' : 'username')
  const [posts, setPosts] = useState<ThreadsPost[]>(USE_MOCK_DATA ? MOCK_POSTS : [])
  const [profile, setProfile] = useState<ThreadsProfile | null>(USE_MOCK_DATA ? MOCK_PROFILE : null)
  const [downloadUrl, setDownloadUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(USE_MOCK_DATA ? MOCK_POSTS.map(p => p.id) : [])
  )
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentSpread, setCurrentSpread] = useState(0)
  const [currentUsername, setCurrentUsername] = useState('')
  const [displayLimit, setDisplayLimit] = useState(10)
  const [bookStructure, setBookStructure] = useState<BookStructure | null>(
    USE_MOCK_DATA ? MOCK_BOOK_STRUCTURE : null
  )
  const [organizing, setOrganizing] = useState(false)

  // Derived values
  const currentStepIndex = STEPS.indexOf(step)

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

  const pages = useMemo(() => {
    if (orderedPosts.length === 0 || !profile) return []
    return generatePageContents(orderedPosts, profile, bookStructure ?? undefined)
  }, [orderedPosts, profile, bookStructure])

  const spreads = useMemo(() => calculateSpreads(pages), [pages])

  // Organize book with Gemini AI
  const organizeBook = useCallback(async () => {
    if (!profile || posts.length === 0) return

    setOrganizing(true)
    setError('')
    try {
      const res = await fetch('/api/organize-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posts, profile })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setBookStructure(data as BookStructure)
      // Select all posts by default
      setSelectedIds(new Set(posts.map(p => p.id)))
    } catch (err: any) {
      setError(err.message)
      // Fallback to mock structure if available
      if (USE_MOCK_DATA) {
        setBookStructure(MOCK_BOOK_STRUCTURE)
      }
    } finally {
      setOrganizing(false)
    }
  }, [posts, profile])

  const regenerateStructure = useCallback(() => {
    setBookStructure(null)
    setCurrentSpread(0)
    organizeBook()
  }, [organizeBook])

  // Actions
  const submitUsername = async (username: string) => {
    setLoading(true)
    setError('')
    try {
      // Call worker directly to bypass Vercel 10s timeout
      const cleanUsername = username.replace(/^@/, '').trim()
      const { posts: scrapedPosts, profile: scrapedProfile } = await scrapeThreadsDirect(cleanUsername, 100)

      setPosts(scrapedPosts)
      setProfile(scrapedProfile)
      setCurrentUsername(cleanUsername)
      setDisplayLimit(10)
      // Select ALL posts by default
      setSelectedIds(new Set(scrapedPosts.map(p => p.id)))
      setStep('organize')

      // Auto-organize with Gemini
      setOrganizing(true)
      try {
        const organizeRes = await fetch('/api/organize-book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ posts: scrapedPosts, profile: scrapedProfile })
        })
        const organizeData = await organizeRes.json()
        if (!organizeRes.ok) throw new Error(organizeData.error)
        setBookStructure(organizeData as BookStructure)
      } catch (orgErr: any) {
        console.error('Failed to organize book:', orgErr.message)
        // Continue without book structure - will use default ordering
      } finally {
        setOrganizing(false)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadMorePosts = () => {
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
  }

  const generateLoom = async () => {
    if (!profile) return

    setLoading(true)
    setError('')
    try {
      // 1. Call worker directly for PDF generation (bypasses Vercel timeout)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const userId = user.id

      const { pdfPath, loomId } = await createLoomDirect(
        orderedPosts, profile, userId, bookStructure ?? undefined
      )

      // 2. Register loom in DB via Vercel API (fast, no timeout risk)
      const res = await fetch('/api/looms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfPath, loomId, posts: orderedPosts, profile })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setDownloadUrl(data.downloadUrl)
      setStep('complete')

      if (onComplete && data.loom) {
        onComplete(data.loom)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const createAnother = () => {
    setPosts([])
    setProfile(null)
    setDownloadUrl('')
    setSelectedIds(new Set())
    setBookStructure(null)
    setStep('username')
  }

  const togglePost = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
    setCurrentSpread(0)
  }

  const toggleAll = () => {
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
    setCurrentSpread(0)
  }

  const prevSpread = () => {
    setCurrentSpread(prev => Math.max(0, prev - 1))
  }

  const nextSpread = () => {
    setCurrentSpread(prev => Math.min(spreads.length - 1, prev + 1))
  }

  const goBack = () => {
    setStep('username')
    setBookStructure(null)
  }

  const computedHasMore = displayLimit < posts.length

  const value: CreateFlowContextValue = {
    state: {
      step, posts, profile, downloadUrl, loading, loadingMore,
      hasMore: computedHasMore, error, selectedIds, sortOrder,
      searchQuery, currentSpread, bookStructure, organizing,
    },
    actions: {
      submitUsername, generateLoom, createAnother, togglePost, toggleAll,
      setSortOrder, setSearchQuery, prevSpread, nextSpread, goBack,
      loadMorePosts, organizeBook, regenerateStructure,
    },
    meta: {
      steps: STEPS, currentStepIndex, filteredAndSortedPosts, selectedPosts,
      orderedPosts, pages, spreads, currentSpreadData: spreads[currentSpread],
      selectedCount: selectedIds.size, totalSpreads: spreads.length,
    },
  }

  return (
    <CreateFlowContext value={value}>
      {children}
    </CreateFlowContext>
  )
}
