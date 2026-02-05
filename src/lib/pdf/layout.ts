import { ThreadsPost } from '@/types/threads'

// Content area calculation (in pixels)
// Page: 793.7px (210mm), Padding: 83.15px * 2 (22mm * 2)
// Content area height: 793.7 - 166.3 = 627.4px
// Using exact value for precise splitting
const MAX_PAGE_HEIGHT = 627

// Height estimates (in pixels) - based on actual rendered values
const POST_HEADER_HEIGHT = 48   // Avatar (28px) + margins + username line
const POST_STATS_HEIGHT = 30    // Stats row height
const POST_MARGIN = 36          // margin-bottom (20px) + padding-bottom (16px)
const LINE_HEIGHT = 21          // Actual line-height: ~20px + small buffer
const CHARS_PER_LINE = 28       // 408px width / ~14.5px per Korean char
const IMAGE_HEIGHT = 130        // max-height (120px) + margin (10px)

// Minimum height for continuation
const MIN_CONTINUATION_HEIGHT = POST_HEADER_HEIGHT + LINE_HEIGHT * 2

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
}

interface PageLayout {
  posts: ThreadsPost[]
  chunks?: PostChunk[]  // New: for split posts
}

export function calculateLayout(posts: ThreadsPost[]): PageLayout[] {
  const pages: PageLayout[] = []
  let currentChunks: PostChunk[] = []
  let currentHeight = 0
  let lastPostWasSplit = false  // Track if previous post was split across pages

  for (const post of posts) {
    const postHeight = estimatePostHeight(post)

    // If last post was split, start a new page
    if (lastPostWasSplit && currentChunks.length > 0) {
      pages.push({ posts: [], chunks: currentChunks })
      currentChunks = []
      currentHeight = 0
    }

    // Check if post fits in current page
    if (currentHeight + postHeight <= MAX_PAGE_HEIGHT) {
      // Post fits entirely on current page
      currentChunks.push(createFullPostChunk(post))
      currentHeight += postHeight
      lastPostWasSplit = false
    } else if (postHeight <= MAX_PAGE_HEIGHT) {
      // Post doesn't fit but can fit on a new page entirely
      if (currentChunks.length > 0) {
        pages.push({ posts: [], chunks: currentChunks })
      }
      currentChunks = [createFullPostChunk(post)]
      currentHeight = postHeight
      lastPostWasSplit = false
    } else {
      // Post is too tall - needs to be split across pages
      const chunks = splitPostAcrossPages(post, currentHeight)
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        const chunkHeight = estimateChunkHeight(chunk)

        if (i === 0 && currentHeight + chunkHeight <= MAX_PAGE_HEIGHT) {
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
  }

  // Add remaining chunks
  if (currentChunks.length > 0) {
    pages.push({ posts: [], chunks: currentChunks })
  }

  return pages
}

function createFullPostChunk(post: ThreadsPost): PostChunk {
  return {
    post,
    contentStart: 0,
    contentEnd: post.content.length,
    showHeader: true,
    showStats: true,
    showImages: true,
    isFirstChunk: true,
    isLastChunk: true
  }
}

function splitPostAcrossPages(post: ThreadsPost, currentPageUsed: number): PostChunk[] {
  const chunks: PostChunk[] = []
  const content = post.content
  
  // Calculate available height for first chunk
  let availableHeight = MAX_PAGE_HEIGHT - currentPageUsed
  
  // If not enough space for meaningful content, start fresh on new page
  if (availableHeight < MIN_CONTINUATION_HEIGHT) {
    availableHeight = MAX_PAGE_HEIGHT
  }

  let contentIndex = 0
  let isFirst = true

  while (contentIndex < content.length) {
    // Calculate how much content fits
    const headerHeight = isFirst ? POST_HEADER_HEIGHT : 0
    const imageHeight = isFirst && post.imageUrls.length > 0 ? IMAGE_HEIGHT : 0
    const statsHeight = 0 // Stats only shown on last chunk, calculated after
    const availableForText = availableHeight - headerHeight - imageHeight - POST_MARGIN - statsHeight
    
    // Calculate how many lines fit
    const linesAvailable = Math.max(Math.floor(availableForText / LINE_HEIGHT), 1)
    
    // Find end index based on available lines
    let endIndex = findEndIndexForLines(content, contentIndex, linesAvailable)
    
    const isLast = endIndex >= content.length

    chunks.push({
      post,
      contentStart: contentIndex,
      contentEnd: endIndex,
      showHeader: isFirst,
      showStats: isLast,
      showImages: isFirst,
      isFirstChunk: isFirst,
      isLastChunk: isLast
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
    const renderedLines = Math.max(Math.ceil(line.length / CHARS_PER_LINE), 1)
    
    if (lineCount + renderedLines > maxLines) {
      // This line would exceed the limit
      if (lineCount === 0) {
        // First line - need to split it
        const charsForRemainingLines = maxLines * CHARS_PER_LINE
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
  let height = POST_MARGIN

  if (chunk.showHeader) {
    height += POST_HEADER_HEIGHT
  }

  if (chunk.showStats) {
    height += POST_STATS_HEIGHT
  }

  if (chunk.showImages && chunk.post.imageUrls.length > 0) {
    height += IMAGE_HEIGHT
  }

  // Text height for this chunk
  const chunkContent = chunk.post.content.slice(chunk.contentStart, chunk.contentEnd)
  height += estimateTextHeight(chunkContent)

  return height
}

function estimatePostHeight(post: ThreadsPost): number {
  let height = POST_HEADER_HEIGHT + POST_STATS_HEIGHT + POST_MARGIN

  // Text height
  height += estimateTextHeight(post.content)

  // Image height
  if (post.imageUrls.length > 0) {
    height += IMAGE_HEIGHT
  }

  return height
}

// Estimate text height based on content
function estimateTextHeight(content: string): number {
  const lines = content.split('\n')
  let totalLines = 0
  
  for (const line of lines) {
    // Each line takes at least 1 rendered line, plus extra for long lines
    const renderedLines = Math.max(Math.ceil(line.length / CHARS_PER_LINE), 1)
    totalLines += renderedLines
  }
  
  return totalLines * LINE_HEIGHT
}
