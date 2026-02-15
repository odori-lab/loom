import { ThreadsPost, ThreadsProfile } from '@/types/threads'
import { BookStructure, ImageCaption } from '@/types/book'
import { PDF_STYLES } from './templates/styles'
import { generateCoverPage } from './templates/cover'
import { generateContentPageFromChunks, generateEssaySubChapterPage, generateEssayContinuationPage, CaptionMap } from './templates/content'
import { generateTocPage } from './templates/toc'
import { generatePrefacePage } from './templates/preface'
import { generateChapterTitlePage } from './templates/chapter'
import { generateLastPage } from './templates/last'
import { calculateLayout, PostChunk, MergedPost } from './layout'
export type { MergedPost } from './layout'

// Generate HTML for a single page (used by both PDF and Preview)
export function generatePageHtml(pageContent: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>${PDF_STYLES}</style>
      </head>
      <body>
        ${pageContent}
      </body>
    </html>
  `
}

// Check if two page indices are in the same spread
// Spread layout: cover alone, then content pages in pairs (1-2, 3-4, ...), last page alone or paired
// Content page indices start at 1 (after cover at 0)
function isSameSpread(pageIndex1: number, pageIndex2: number, totalPages: number): boolean {
  // Cover (index 0) is always alone
  if (pageIndex1 === 0 || pageIndex2 === 0) return false

  // Last page is separate (not same spread with content)
  if (pageIndex1 === totalPages - 1 || pageIndex2 === totalPages - 1) return false

  // Content pages: 1-2 are spread 0, 3-4 are spread 1, etc.
  // (index - 1) / 2 gives spread number for content pages
  const spread1 = Math.floor((pageIndex1 - 1) / 2)
  const spread2 = Math.floor((pageIndex2 - 1) / 2)

  return spread1 === spread2
}

// Generate page contents (array of page HTML strings)
// When bookStructure is provided, generates essay-style book with TOC, preface, chapters
// When not provided, generates legacy Threads-style layout
export function generatePageContents(
  posts: ThreadsPost[],
  profile: ThreadsProfile,
  bookStructure?: BookStructure
): string[] {
  if (bookStructure) {
    return generateEssayPageContents(posts, profile, bookStructure)
  }

  return generateLegacyPageContents(posts, profile)
}

// Legacy Threads-style page generation (original behavior)
function generateLegacyPageContents(
  posts: ThreadsPost[],
  profile: ThreadsProfile
): string[] {
  const pageLayouts = calculateLayout(posts)

  const pages: string[] = []

  // Cover page (index 0)
  pages.push(generateCoverPage(profile))

  // Collect all content page chunks with their page indices
  const contentPageChunks: { pageIndex: number; chunks: PostChunk[] }[] = []
  pageLayouts.forEach((layout, idx) => {
    if (layout.chunks && layout.chunks.length > 0) {
      contentPageChunks.push({
        pageIndex: idx + 1, // +1 because cover is at index 0
        chunks: layout.chunks
      })
    }
  })

  // Total pages count (cover + content + last)
  const totalPages = 1 + contentPageChunks.length + 1

  // Process chunks to set continue indicators based on spread position
  for (let i = 0; i < contentPageChunks.length; i++) {
    const { pageIndex, chunks } = contentPageChunks[i]

    // Check last chunk of this page
    const lastChunk = chunks[chunks.length - 1]
    if (!lastChunk.isLastChunk) {
      // This post continues to next page
      const nextPageIndex = pageIndex + 1
      // Show "continues..." only if crossing spread boundary
      lastChunk.showContinues = !isSameSpread(pageIndex, nextPageIndex, totalPages)
    }

    // Check first chunk of this page
    const firstChunk = chunks[0]
    if (!firstChunk.isFirstChunk) {
      // This post continued from previous page
      const prevPageIndex = pageIndex - 1
      // Show "continued" only if crossing spread boundary
      firstChunk.showContinued = !isSameSpread(prevPageIndex, pageIndex, totalPages)
    }
  }

  // Generate content pages
  contentPageChunks.forEach(({ chunks }) => {
    pages.push(generateContentPageFromChunks(chunks, profile))
  })

  // Add blank page if content pages are odd (for print-friendly spreads)
  if (contentPageChunks.length % 2 === 1) {
    pages.push(generateBlankPage())
  }

  // Last page
  pages.push(generateLastPage())

  return pages
}

// Merge thread posts: group by threadId, combine content, sum likes
export function mergeThreadPosts(posts: ThreadsPost[]): MergedPost[] {
  const merged: MergedPost[] = []
  const threadGroups = new Map<string, ThreadsPost[]>()
  const seenThreadIds: string[] = []

  for (const post of posts) {
    if (post.threadId) {
      if (!threadGroups.has(post.threadId)) {
        threadGroups.set(post.threadId, [])
        seenThreadIds.push(post.threadId)
      }
      threadGroups.get(post.threadId)!.push(post)
    } else {
      // Posts without threadId: each is its own group
      // Use a unique key to maintain order
      merged.push({
        content: post.content,
        date: new Date(post.postedAt),
        likeCount: post.likeCount || 0,
        imageUrls: [...post.imageUrls],
        postIds: [post.id]
      })
    }
  }

  // Now insert thread groups in order of first occurrence
  // We need to rebuild merged in the correct order
  const result: MergedPost[] = []
  let nonThreadIdx = 0
  const threadInserted = new Set<string>()

  for (const post of posts) {
    if (post.threadId) {
      if (!threadInserted.has(post.threadId)) {
        threadInserted.add(post.threadId)
        const group = threadGroups.get(post.threadId)!
        result.push({
          content: group.map(p => p.content).join('\n\n'),
          date: new Date(group[0].postedAt),
          likeCount: group.reduce((sum, p) => sum + (p.likeCount || 0), 0),
          imageUrls: group.flatMap(p => p.imageUrls),
          postIds: group.map(p => p.id)
        })
      }
    } else {
      result.push(merged[nonThreadIdx])
      nonThreadIdx++
    }
  }

  return result
}

// Height estimation constants for essay mode (in pixels)
// Page content area: 210mm = 793.7px - 22mm*2 padding = 627px
const ESSAY_CONTENT_HEIGHT = 627
const ESSAY_SUB_CHAPTER_TITLE_HEIGHT = 40  // sub-chapter title + margin
const ESSAY_POST_HEADER_HEIGHT = 24        // date + likes line
const ESSAY_POST_MARGIN = 20               // margin-bottom between posts
const ESSAY_LINE_HEIGHT = 24               // 10pt * 1.7 line-height ≈ 23px, rounded up
const ESSAY_CHARS_PER_LINE = 30            // content area ~108mm at 10pt
const ESSAY_IMAGE_HEIGHT = 224             // max-height 200px + margin 24px

// Estimate the height of a single merged post
function estimateMergedPostHeight(post: MergedPost): number {
  let height = ESSAY_POST_HEADER_HEIGHT + ESSAY_POST_MARGIN

  // Text height
  const lines = post.content.split('\n')
  let totalLines = 0
  for (const line of lines) {
    totalLines += Math.max(Math.ceil(line.length / ESSAY_CHARS_PER_LINE), 1)
  }
  height += totalLines * ESSAY_LINE_HEIGHT

  // Image height
  height += post.imageUrls.length * ESSAY_IMAGE_HEIGHT

  return height
}

// Split merged posts into page groups, returning page HTML strings
function splitSubChapterIntoPages(
  subChapterTitle: string,
  mergedPosts: MergedPost[],
  profile: ThreadsProfile,
  chapterIdx: number,
  subIdx: number,
  captionMap?: CaptionMap
): string[] {
  const pageGroups: MergedPost[][] = []
  let currentGroup: MergedPost[] = []
  // First page has less space due to sub-chapter title
  let remainingHeight = ESSAY_CONTENT_HEIGHT - ESSAY_SUB_CHAPTER_TITLE_HEIGHT
  let isFirstPage = true

  for (const post of mergedPosts) {
    const postHeight = estimateMergedPostHeight(post)

    if (currentGroup.length > 0 && postHeight > remainingHeight) {
      // This post would overflow; start a new page
      pageGroups.push(currentGroup)
      currentGroup = [post]
      // Subsequent pages have full content area
      remainingHeight = ESSAY_CONTENT_HEIGHT - postHeight
      isFirstPage = false
    } else {
      currentGroup.push(post)
      remainingHeight -= postHeight
    }
  }

  // Push the last group
  if (currentGroup.length > 0) {
    pageGroups.push(currentGroup)
  }

  // Generate HTML for each page group
  return pageGroups.map((group, i) => {
    if (i === 0) {
      // First page: includes sub-chapter title
      return generateEssaySubChapterPage(subChapterTitle, group, profile, chapterIdx, subIdx, captionMap)
    } else {
      // Continuation pages: just posts, no title
      return generateEssayContinuationPage(group, captionMap)
    }
  })
}

// Essay-style book page generation
function generateEssayPageContents(
  posts: ThreadsPost[],
  profile: ThreadsProfile,
  bookStructure: BookStructure
): string[] {
  const pages: string[] = []

  // Build a map of postId -> post for quick lookup
  const postMap = new Map<string, ThreadsPost>()
  for (const post of posts) {
    postMap.set(post.id, post)
  }

  // Build caption lookup map: postId -> caption
  const captionMap: CaptionMap = buildCaptionMap(bookStructure.imageCaptions)

  // 1. Cover page with book title
  pages.push(generateCoverPage(profile, bookStructure.title))

  // 2. Table of Contents page
  pages.push(generateTocPage(bookStructure))

  // 3. Preface page
  if (bookStructure.preface) {
    pages.push(generatePrefacePage(bookStructure.preface))
  }

  // 4. For each chapter: chapter title page + sub-chapter content pages
  for (let chapterIdx = 0; chapterIdx < bookStructure.chapters.length; chapterIdx++) {
    const chapter = bookStructure.chapters[chapterIdx]

    // Chapter title page
    pages.push(generateChapterTitlePage(chapter, chapterIdx))

    // For each sub-chapter: generate content pages with overflow splitting
    for (let subIdx = 0; subIdx < chapter.subChapters.length; subIdx++) {
      const subChapter = chapter.subChapters[subIdx]

      // Gather posts for this sub-chapter
      const subChapterPosts: ThreadsPost[] = []
      for (const postId of subChapter.postIds) {
        const post = postMap.get(postId)
        if (post) {
          subChapterPosts.push(post)
        }
      }

      if (subChapterPosts.length === 0) continue

      // Merge posts by threadId
      const mergedPosts = mergeThreadPosts(subChapterPosts)

      // Split into pages if content overflows
      const subChapterPages = splitSubChapterIntoPages(
        subChapter.title,
        mergedPosts,
        profile,
        chapterIdx,
        subIdx,
        captionMap
      )
      pages.push(...subChapterPages)
    }
  }

  // Add blank page if total content pages (excluding cover and last) are odd
  const contentPageCount = pages.length - 1 // subtract cover
  if (contentPageCount % 2 === 1) {
    pages.push(generateBlankPage())
  }

  // 5. Last page
  pages.push(generateLastPage())

  return pages
}

// Build caption lookup map from ImageCaption array: postId -> caption (first caption wins)
function buildCaptionMap(imageCaptions?: ImageCaption[]): CaptionMap {
  const map: CaptionMap = new Map()
  if (!imageCaptions) return map

  for (const cap of imageCaptions) {
    if (!map.has(cap.postId)) {
      map.set(cap.postId, cap.caption)
    }
  }

  return map
}

// Generate blank page for print-friendly spreads
function generateBlankPage(): string {
  return `<div class="page"></div>`
}
