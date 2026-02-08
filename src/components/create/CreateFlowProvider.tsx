'use client'

import { useState, useMemo, ReactNode } from 'react'
import { ThreadsPost, ThreadsProfile } from '@/types/threads'
import { generatePageContents } from '@/lib/pdf/generator'
import { calculateSpreads } from '@/lib/pdf/spreads'
import {
  CreateFlowContext,
  CreateFlowContextValue,
  Step,
  SortOrder,
} from './CreateFlowContext'
import { MOCK_PROFILE, MOCK_POSTS } from '@/lib/mockdata'
import { Database } from '@/types/database'

type Loom = Database['public']['Tables']['looms']['Row']

const USE_MOCK_DATA = false
const STEPS = ['username', 'select', 'complete'] as const

interface CreateFlowProviderProps {
  children: ReactNode
  onComplete?: (loom: Loom) => void
}

export function CreateFlowProvider({ children, onComplete }: CreateFlowProviderProps) {
  // Core state (consolidated from page.tsx + SelectPostsStep.tsx)
  const [step, setStep] = useState<Step>(USE_MOCK_DATA ? 'select' : 'username')
  const [posts, setPosts] = useState<ThreadsPost[]>(USE_MOCK_DATA ? MOCK_POSTS : [])
  const [profile, setProfile] = useState<ThreadsProfile | null>(USE_MOCK_DATA ? MOCK_PROFILE : null)
  const [downloadUrl, setDownloadUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(USE_MOCK_DATA ? MOCK_POSTS.map(p => p.id) : [])
  )
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentSpread, setCurrentSpread] = useState(0)
  const [currentUsername, setCurrentUsername] = useState('')

  // Derived values
  const currentStepIndex = STEPS.indexOf(step)

  const filteredAndSortedPosts = useMemo(() => {
    let result = [...posts]

    if (searchQuery) {
      result = result.filter(p =>
        p.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    return result.toSorted((a, b) => {
      const diff = new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
      return sortOrder === 'newest' ? diff : -diff
    })
  }, [posts, searchQuery, sortOrder])

  const selectedPosts = useMemo(() => {
    return posts
      .filter(p => selectedIds.has(p.id))
      .toSorted((a, b) => {
        const diff = new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
        return sortOrder === 'newest' ? diff : -diff
      })
  }, [posts, selectedIds, sortOrder])

  const pages = useMemo(() => {
    if (selectedPosts.length === 0 || !profile) return []
    return generatePageContents(selectedPosts, profile)
  }, [selectedPosts, profile])

  const spreads = useMemo(() => calculateSpreads(pages), [pages])

  // Actions
  const submitUsername = async (username: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, limit: 30 })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setPosts(data.posts)
      setProfile(data.profile)
      setHasMore(data.hasMore)
      setCurrentUsername(username)
      setSelectedIds(new Set(data.posts.map((p: ThreadsPost) => p.id)))
      setStep('select')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadMorePosts = async () => {
    if (!currentUsername || loadingMore || !hasMore) return

    setLoadingMore(true)
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: currentUsername,
          limit: 20,
          cursor: posts.length.toString(),
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Deduplicate posts
      const existingIds = new Set(posts.map(p => p.id))
      const newPosts = data.posts.filter((p: ThreadsPost) => !existingIds.has(p.id))

      setPosts(prev => [...prev, ...newPosts])
      setHasMore(data.hasMore)

      // Auto-select new posts
      setSelectedIds(prev => {
        const next = new Set(prev)
        newPosts.forEach((p: ThreadsPost) => next.add(p.id))
        return next
      })
    } catch (err: any) {
      console.error('[LOAD_MORE_ERROR]', err)
    } finally {
      setLoadingMore(false)
    }
  }

  const generateLoom = async () => {
    if (!profile) return

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/looms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posts: selectedPosts, profile })
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
      if (prev.size === filteredAndSortedPosts.length) {
        return new Set()
      }
      return new Set(filteredAndSortedPosts.map(p => p.id))
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
  }

  const value: CreateFlowContextValue = {
    state: { step, posts, profile, downloadUrl, loading, loadingMore, hasMore, error, selectedIds, sortOrder, searchQuery, currentSpread },
    actions: { submitUsername, generateLoom, createAnother, togglePost, toggleAll, setSortOrder, setSearchQuery, prevSpread, nextSpread, goBack, loadMorePosts },
    meta: { steps: STEPS, currentStepIndex, filteredAndSortedPosts, selectedPosts, pages, spreads, currentSpreadData: spreads[currentSpread], selectedCount: selectedIds.size, totalSpreads: spreads.length },
  }

  return (
    <CreateFlowContext value={value}>
      {children}
    </CreateFlowContext>
  )
}
