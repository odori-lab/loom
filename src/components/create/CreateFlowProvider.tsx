'use client'

import { useState, useMemo, useCallback, ReactNode } from 'react'
import { ThreadsPost, ThreadsProfile } from '@/types/threads'
import { scrapeThreadsDirect, createLoomDirect } from '@/lib/worker-client'
import { createClient } from '@/lib/supabase/client'
import {
  CreateFlowContext,
  CreateFlowContextValue,
  Step,
  LoadingPhase,
} from './CreateFlowContext'
import { MOCK_PROFILE, MOCK_POSTS, MOCK_BOOK_STRUCTURE } from '@/lib/mockdata'
import { Database } from '@/types/database'
import { usePostSelection } from '@/hooks/usePostSelection'
import { useBookOrganization } from '@/hooks/useBookOrganization'
import { usePdfMeasurement } from '@/hooks/usePdfMeasurement'

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
  const [error, setError] = useState('')
  const [currentSpread, setCurrentSpread] = useState(0)
  const [currentUsername, setCurrentUsername] = useState('')
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>('idle')

  // Composed hooks
  const book = useBookOrganization(
    posts,
    profile,
    USE_MOCK_DATA ? MOCK_BOOK_STRUCTURE : null,
  )
  const selection = usePostSelection(
    posts,
    book.bookStructure,
    USE_MOCK_DATA ? new Set(MOCK_POSTS.map(p => p.id)) : undefined,
  )
  const pdf = usePdfMeasurement(selection.orderedPosts, profile, book.bookStructure)

  // Derived values
  const currentStepIndex = STEPS.indexOf(step)

  // Wrap toggle actions with spread reset
  const togglePost = useCallback((id: string) => {
    selection.togglePost(id)
    setCurrentSpread(0)
  }, [selection.togglePost])

  const toggleAll = useCallback(() => {
    selection.toggleAll()
    setCurrentSpread(0)
  }, [selection.toggleAll])

  // Wrap organizeBook to handle error + selectedIds side effects
  const organizeBook = useCallback(async () => {
    setError('')
    try {
      await book.organizeBook()
      // Select all posts by default after organizing
      selection.setSelectedIds(new Set(posts.map(p => p.id)))
    } catch (err: any) {
      setError(err.message)
      // Fallback to mock structure if available
      if (USE_MOCK_DATA) {
        book.setBookStructure(MOCK_BOOK_STRUCTURE)
      }
    }
  }, [book.organizeBook, book.setBookStructure, posts, selection.setSelectedIds])

  // Wrap regenerateStructure with spread reset + organizeBook
  const regenerateStructure = useCallback(() => {
    book.regenerateStructure()
    setCurrentSpread(0)
    organizeBook()
  }, [book.regenerateStructure, organizeBook])

  // Actions
  const submitUsername = async (username: string) => {
    setLoading(true)
    setLoadingPhase('scraping')
    setError('')
    try {
      // Phase 1: Scrape posts
      const cleanUsername = username.replace(/^@/, '').trim()
      const { posts: scrapedPosts, profile: scrapedProfile } = await scrapeThreadsDirect(cleanUsername, 100)

      setPosts(scrapedPosts)
      setProfile(scrapedProfile)
      setCurrentUsername(cleanUsername)
      selection.setDisplayLimit(10)
      selection.setSelectedIds(new Set(scrapedPosts.map(p => p.id)))

      // Phase 2: Organize book structure (before navigating)
      setLoadingPhase('organizing')
      try {
        const organizeRes = await fetch('/api/organize-book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ posts: scrapedPosts, profile: scrapedProfile })
        })
        const organizeData = await organizeRes.json()
        if (!organizeRes.ok) throw new Error(organizeData.error)
        book.setBookStructure(organizeData)
      } catch (orgErr: any) {
        console.error('Failed to organize book:', orgErr.message)
        // Continue without book structure - will use default ordering
      }

      // Phase 3: Navigate only after both phases complete
      setStep('organize')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
      setLoadingPhase('idle')
    }
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
        selection.orderedPosts, profile, userId, book.bookStructure ?? undefined
      )

      // 2. Enrich bookStructure with page numbers from measurement
      const enrichedStructure = book.bookStructure ? {
        ...book.bookStructure,
        chapters: book.bookStructure.chapters.map((ch, chIdx) => ({
          ...ch,
          startPage: pdf.pageMapping?.get(`chapter-${chIdx}`) ?? undefined,
          subChapters: ch.subChapters.map((sc, scIdx) => ({
            ...sc,
            startPage: pdf.pageMapping?.get(`sub-chapter-${chIdx}-${scIdx}`) ?? undefined,
          })),
        })),
      } : null

      // 3. Register loom in DB via Vercel API (fast, no timeout risk)
      const res = await fetch('/api/looms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfPath, loomId, posts: selection.orderedPosts, profile, title: enrichedStructure?.title || null, bookStructure: enrichedStructure })
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
    selection.setSelectedIds(new Set())
    book.setBookStructure(null)
    setStep('username')
  }

  const prevSpread = () => {
    setCurrentSpread(prev => Math.max(0, prev - 1))
  }

  const nextSpread = () => {
    setCurrentSpread(prev => Math.min(pdf.spreads.length - 1, prev + 1))
  }

  const goBack = () => {
    setStep('username')
    book.setBookStructure(null)
  }

  const value = useMemo<CreateFlowContextValue>(() => ({
    state: {
      step, posts, profile, downloadUrl, loading,
      loadingMore: selection.loadingMore, loadingPhase,
      hasMore: selection.hasMore, error,
      selectedIds: selection.selectedIds, sortOrder: selection.sortOrder,
      searchQuery: selection.searchQuery, currentSpread,
      bookStructure: book.bookStructure, organizing: book.organizing,
      measuring: pdf.measuring, spreadTarget: pdf.spreadTarget,
    },
    actions: {
      submitUsername, generateLoom, createAnother, togglePost, toggleAll,
      setSortOrder: selection.setSortOrder, setSearchQuery: selection.setSearchQuery,
      prevSpread, nextSpread, goBack,
      loadMorePosts: selection.loadMorePosts, organizeBook,
      regenerateStructure, goToSpread: pdf.goToSpread,
    },
    meta: {
      steps: STEPS, currentStepIndex,
      filteredAndSortedPosts: selection.filteredAndSortedPosts,
      selectedPosts: selection.selectedPosts,
      orderedPosts: selection.orderedPosts,
      pages: pdf.pages, spreads: pdf.spreads,
      currentSpreadData: pdf.spreads[currentSpread],
      selectedCount: selection.selectedIds.size,
      totalSpreads: pdf.spreads.length,
      blockToSpread: pdf.blockToSpread,
      pageMapping: pdf.pageMapping,
    },
  }), [
    step, posts, profile, downloadUrl, loading, loadingPhase, error, currentSpread,
    currentStepIndex,
    selection.loadingMore, selection.hasMore, selection.selectedIds, selection.sortOrder,
    selection.searchQuery, selection.filteredAndSortedPosts, selection.selectedPosts,
    selection.orderedPosts, selection.setSortOrder, selection.setSearchQuery,
    selection.loadMorePosts,
    book.bookStructure, book.organizing,
    pdf.measuring, pdf.spreadTarget, pdf.pages, pdf.spreads, pdf.blockToSpread,
    pdf.goToSpread, pdf.pageMapping,
    togglePost, toggleAll, organizeBook, regenerateStructure,
  ])

  return (
    <CreateFlowContext value={value}>
      {children}
    </CreateFlowContext>
  )
}
