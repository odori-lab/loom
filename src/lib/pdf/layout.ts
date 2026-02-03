import { ThreadsPost } from '@/types/threads'

// Approximate content height calculation
// A5 content area height: ~166mm = ~470pt at 72dpi
const MAX_PAGE_HEIGHT = 470

// Height estimates (in points)
const POST_HEADER_HEIGHT = 40
const POST_STATS_HEIGHT = 20
const POST_MARGIN = 20
const LINE_HEIGHT = 14
const CHARS_PER_LINE = 45 // Approximate for A5 width
const IMAGE_HEIGHT = 120

interface PageLayout {
  posts: ThreadsPost[]
}

export function calculateLayout(posts: ThreadsPost[]): PageLayout[] {
  const pages: PageLayout[] = []
  let currentPage: PageLayout = { posts: [] }
  let currentHeight = 0

  for (const post of posts) {
    const postHeight = estimatePostHeight(post)

    if (currentHeight + postHeight > MAX_PAGE_HEIGHT) {
      // Start new page
      if (currentPage.posts.length > 0) {
        pages.push(currentPage)
      }
      currentPage = { posts: [post] }
      currentHeight = postHeight
    } else {
      // Add to current page
      currentPage.posts.push(post)
      currentHeight += postHeight
    }
  }

  // Add remaining posts
  if (currentPage.posts.length > 0) {
    pages.push(currentPage)
  }

  return pages
}

function estimatePostHeight(post: ThreadsPost): number {
  let height = POST_HEADER_HEIGHT + POST_STATS_HEIGHT + POST_MARGIN

  // Text height
  const textLines = Math.ceil(post.content.length / CHARS_PER_LINE)
  // Account for actual line breaks
  const lineBreaks = (post.content.match(/\n/g) || []).length
  height += (textLines + lineBreaks) * LINE_HEIGHT

  // Image height
  if (post.imageUrls.length > 0) {
    height += IMAGE_HEIGHT
  }

  return height
}
