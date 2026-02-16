import { ThreadsPost } from '@/types/threads'

// ─── Content block types (from content-blocks.ts) ───

export interface ContentBlock {
  id: string
  html: string
  type: 'cover' | 'toc' | 'preface' | 'chapter-title' | 'sub-chapter' | 'post' | 'last' | 'blank'
  fullPage?: boolean
}

// ─── Measurement types (from measure.ts) ───

export interface MeasuredBlock extends ContentBlock {
  measuredHeight: number
}

// Maps block ID to its 1-based page number
export type PageMapping = Map<string, number>

// ─── Layout types (from layout.ts) ───

// Merged post type for combining thread posts in essay mode
export interface MergedPost {
  content: string
  date: Date
  likeCount: number
  imageUrls: string[]
  postIds?: string[]
}

export interface PostChunk {
  post: ThreadsPost
  contentStart: number  // Start index in content
  contentEnd: number    // End index in content
  showHeader: boolean   // Show header only on first chunk
  showStats: boolean    // Show stats only on last chunk
  showImages: boolean   // Show images only on first chunk (or when fits)
  isFirstChunk: boolean
  isLastChunk: boolean
  // Continue indicators - set by generator based on spread position
  showContinued?: boolean   // Show "(...continued)" at top
  showContinues?: boolean   // Show "(continues...)" at bottom
  // Thread information for self-reply chains
  threadPosition?: number   // Position in thread (1, 2, 3...)
  threadTotal?: number      // Total posts in thread
}

export interface PageLayout {
  posts: ThreadsPost[]
  chunks?: PostChunk[]  // New: for split posts
}

// ─── Caption map type (from content.ts / content-blocks.ts) ───

// Caption map type: postId -> caption (one caption per post)
export type CaptionMap = Map<string, string>
