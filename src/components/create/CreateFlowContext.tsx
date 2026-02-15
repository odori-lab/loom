'use client'

import { createContext, use } from 'react'
import { ThreadsPost, ThreadsProfile } from '@/types/threads'
import { BookStructure } from '@/types/book'
import { SpreadData } from '@/lib/pdf/spreads'

export type Step = 'username' | 'organize' | 'complete'
export type SortOrder = 'newest' | 'oldest'

export interface CreateFlowState {
  step: Step
  posts: ThreadsPost[]
  profile: ThreadsProfile | null
  downloadUrl: string
  loading: boolean
  loadingMore: boolean
  error: string
  selectedIds: Set<string>
  sortOrder: SortOrder
  searchQuery: string
  currentSpread: number
  hasMore: boolean
  bookStructure: BookStructure | null
  organizing: boolean
}

export interface CreateFlowActions {
  submitUsername: (username: string) => void
  generateLoom: () => void
  createAnother: () => void
  togglePost: (id: string) => void
  toggleAll: () => void
  setSortOrder: (order: SortOrder) => void
  setSearchQuery: (query: string) => void
  prevSpread: () => void
  nextSpread: () => void
  goBack: () => void
  loadMorePosts: () => void
  organizeBook: () => void
  regenerateStructure: () => void
}

export interface CreateFlowMeta {
  steps: readonly Step[]
  currentStepIndex: number
  filteredAndSortedPosts: ThreadsPost[]
  selectedPosts: ThreadsPost[]
  orderedPosts: ThreadsPost[]
  pages: string[]
  spreads: SpreadData[]
  currentSpreadData: SpreadData | undefined
  selectedCount: number
  totalSpreads: number
}

export interface CreateFlowContextValue {
  state: CreateFlowState
  actions: CreateFlowActions
  meta: CreateFlowMeta
}

export const CreateFlowContext = createContext<CreateFlowContextValue | undefined>(undefined)

export function useCreateFlow(): CreateFlowContextValue {
  const context = use(CreateFlowContext)
  if (!context) {
    throw new Error('useCreateFlow must be used within a CreateFlowProvider')
  }
  return context
}
