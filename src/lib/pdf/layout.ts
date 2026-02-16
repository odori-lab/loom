import { ThreadsPost } from '@/types/threads'
import { MergedPost, PostChunk, PageLayout } from './types'
import { MAX_PAGE_HEIGHT, LEGACY } from './constants'

// Re-export types for backward compatibility
export type { MergedPost, PostChunk, PageLayout } from './types'

// Build thread information map: threadId -> { positions, total }
function buildThreadInfo(posts: ThreadsPost[]): Map<string, { posts: ThreadsPost[], positions: Map<string, number> }> {
  const threadInfo = new Map<string, { posts: ThreadsPost[], positions: Map<string, number> }>()

  for (const post of posts) {
    if (post.threadId) {
      if (!threadInfo.has(post.threadId)) {
        threadInfo.set(post.threadId, { posts: [], positions: new Map() })
      }
      const info = threadInfo.get(post.threadId)!
      info.posts.push(post)
      info.positions.set(post.id, info.posts.length)
    }
  }

  return threadInfo
}

// Calculate combined height for a group of posts
function calculateGroupHeight(posts: ThreadsPost[]): number {
  return posts.reduce((sum, post) => sum + estimatePostHeight(post), 0)
}

export function calculateLayout(posts: ThreadsPost[]): PageLayout[] {
  const pages: PageLayout[] = []
  let currentChunks: PostChunk[] = []
  let currentHeight = 0
  let lastPostWasSplit = false  // Track if previous post was split across pages

  // Build thread information
  const threadInfo = buildThreadInfo(posts)

  // Track which thread posts have been processed
  const processedPosts = new Set<string>()

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i]

    // Skip if already processed (as part of a thread group)
    if (processedPosts.has(post.id)) {
      continue
    }

    // Get thread info for this post
    const threadData = post.threadId ? threadInfo.get(post.threadId) : null
    const threadPosition = threadData ? threadData.positions.get(post.id) : undefined
    const threadTotal = threadData ? threadData.posts.length : undefined

    // If last post was split, start a new page
    if (lastPostWasSplit && currentChunks.length > 0) {
      pages.push({ posts: [], chunks: currentChunks })
      currentChunks = []
      currentHeight = 0
    }

    // Check if this is the first post of a thread - try to keep thread together
    if (threadData && threadPosition === 1 && threadTotal && threadTotal > 1) {
      const threadGroupHeight = calculateGroupHeight(threadData.posts)

      // If the entire thread can fit on a new page, start fresh
      if (threadGroupHeight <= MAX_PAGE_HEIGHT && currentHeight > 0) {
        const remainingSpace = MAX_PAGE_HEIGHT - currentHeight
        // If less than half the thread fits, start a new page
        if (remainingSpace < threadGroupHeight / 2) {
          pages.push({ posts: [], chunks: currentChunks })
          currentChunks = []
          currentHeight = 0
        }
      }
    }

    const postHeight = estimatePostHeight(post)

    // Check if post fits in current page
    if (currentHeight + postHeight <= MAX_PAGE_HEIGHT) {
      // Post fits entirely on current page
      currentChunks.push(createFullPostChunk(post, threadPosition, threadTotal))
      currentHeight += postHeight
      lastPostWasSplit = false
    } else if (postHeight <= MAX_PAGE_HEIGHT) {
      // Post doesn't fit but can fit on a new page entirely
      if (currentChunks.length > 0) {
        pages.push({ posts: [], chunks: currentChunks })
      }
      currentChunks = [createFullPostChunk(post, threadPosition, threadTotal)]
      currentHeight = postHeight
      lastPostWasSplit = false
    } else {
      // Post is too tall - needs to be split across pages
      const chunks = splitPostAcrossPages(post, currentHeight, threadPosition, threadTotal)

      for (let j = 0; j < chunks.length; j++) {
        const chunk = chunks[j]
        const chunkHeight = estimateChunkHeight(chunk)

        if (j === 0 && currentHeight + chunkHeight <= MAX_PAGE_HEIGHT) {
          // First chunk fits on current page
          currentChunks.push(chunk)
          currentHeight += chunkHeight
        } else {
          // Start new page
          if (currentChunks.length > 0) {
            pages.push({ posts: [], chunks: currentChunks })
          }
          currentChunks = [chunk]
          currentHeight = chunkHeight
        }
      }
      lastPostWasSplit = true  // Mark that this post was split
    }

    processedPosts.add(post.id)
  }

  // Add remaining chunks
  if (currentChunks.length > 0) {
    pages.push({ posts: [], chunks: currentChunks })
  }

  return pages
}

function createFullPostChunk(post: ThreadsPost, threadPosition?: number, threadTotal?: number): PostChunk {
  return {
    post,
    contentStart: 0,
    contentEnd: post.content.length,
    showHeader: true,
    showStats: true,
    showImages: true,
    isFirstChunk: true,
    isLastChunk: true,
    threadPosition,
    threadTotal
  }
}

function splitPostAcrossPages(post: ThreadsPost, currentPageUsed: number, threadPosition?: number, threadTotal?: number): PostChunk[] {
  const chunks: PostChunk[] = []
  const content = post.content

  // Calculate available height for first chunk
  let availableHeight = MAX_PAGE_HEIGHT - currentPageUsed

  // If not enough space for meaningful content, start fresh on new page
  if (availableHeight < LEGACY.MIN_CONTINUATION_HEIGHT) {
    availableHeight = MAX_PAGE_HEIGHT
  }

  let contentIndex = 0
  let isFirst = true

  while (contentIndex < content.length) {
    // Calculate how much content fits
    const headerHeight = isFirst ? LEGACY.POST_HEADER_HEIGHT : 0
    const imageHeight = isFirst && post.imageUrls.length > 0 ? LEGACY.IMAGE_HEIGHT : 0
    const statsHeight = 0 // Stats only shown on last chunk, calculated after
    const availableForText = availableHeight - headerHeight - imageHeight - LEGACY.POST_MARGIN - statsHeight

    // Calculate how many lines fit
    const linesAvailable = Math.max(Math.floor(availableForText / LEGACY.LINE_HEIGHT), 1)

    // Find end index based on available lines
    const endIndex = findEndIndexForLines(content, contentIndex, linesAvailable)

    const isLast = endIndex >= content.length

    chunks.push({
      post,
      contentStart: contentIndex,
      contentEnd: endIndex,
      showHeader: isFirst,
      showStats: isLast,
      showImages: isFirst,
      isFirstChunk: isFirst,
      isLastChunk: isLast,
      threadPosition,
      threadTotal
    })

    contentIndex = endIndex
    isFirst = false
    availableHeight = MAX_PAGE_HEIGHT // Full page for subsequent chunks
  }

  return chunks
}

// Find the end index that fits within the given number of lines
function findEndIndexForLines(content: string, startIndex: number, maxLines: number): number {
  const remaining = content.slice(startIndex)
  const lines = remaining.split('\n')

  let lineCount = 0
  let charCount = 0

  for (const line of lines) {
    // Calculate how many rendered lines this text line takes
    const renderedLines = Math.max(Math.ceil(line.length / LEGACY.CHARS_PER_LINE), 1)

    if (lineCount + renderedLines > maxLines) {
      // This line would exceed the limit
      if (lineCount === 0) {
        // First line - need to split it
        const charsForRemainingLines = maxLines * LEGACY.CHARS_PER_LINE
        // Find a good break point
        let breakPoint = Math.min(charsForRemainingLines, line.length)
        const lastSpace = line.lastIndexOf(' ', breakPoint)
        if (lastSpace > 0) {
          breakPoint = lastSpace + 1
        }
        return startIndex + charCount + breakPoint
      }
      // Return up to before this line
      return startIndex + charCount
    }

    lineCount += renderedLines
    charCount += line.length + 1 // +1 for newline
  }

  return content.length
}

function estimateChunkHeight(chunk: PostChunk): number {
  let height = LEGACY.POST_MARGIN

  if (chunk.showHeader) {
    height += LEGACY.POST_HEADER_HEIGHT
  }

  if (chunk.showStats) {
    height += LEGACY.POST_STATS_HEIGHT
  }

  if (chunk.showImages && chunk.post.imageUrls.length > 0) {
    height += LEGACY.IMAGE_HEIGHT
  }

  // Text height for this chunk
  const chunkContent = chunk.post.content.slice(chunk.contentStart, chunk.contentEnd)
  height += estimateTextHeight(chunkContent)

  return height
}

function estimatePostHeight(post: ThreadsPost): number {
  let height = LEGACY.POST_HEADER_HEIGHT + LEGACY.POST_STATS_HEIGHT + LEGACY.POST_MARGIN

  // Text height
  height += estimateTextHeight(post.content)

  // Image height
  if (post.imageUrls.length > 0) {
    height += LEGACY.IMAGE_HEIGHT
  }

  return height
}

// Estimate text height based on content
function estimateTextHeight(content: string): number {
  const lines = content.split('\n')
  let totalLines = 0

  for (const line of lines) {
    // Each line takes at least 1 rendered line, plus extra for long lines
    const renderedLines = Math.max(Math.ceil(line.length / LEGACY.CHARS_PER_LINE), 1)
    totalLines += renderedLines
  }

  return totalLines * LEGACY.LINE_HEIGHT
}
