import { ThreadsPost, ThreadsProfile } from '@/types/threads'
import { PDF_STYLES } from './templates/styles'
import { generateCoverPage } from './templates/cover'
import { generateContentPageFromChunks } from './templates/content'
import { generateLastPage } from './templates/last'
import { calculateLayout, PostChunk } from './layout'

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
export function generatePageContents(
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

// Generate blank page for print-friendly spreads
function generateBlankPage(): string {
  return `<div class="page"></div>`
}

// Legacy exports for backward compatibility
export const generatePdfHtml = (posts: ThreadsPost[], profile: ThreadsProfile): string => {
  const pages = generatePageContents(posts, profile)
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>${PDF_STYLES}</style>
      </head>
      <body>
        ${pages.join('')}
      </body>
    </html>
  `
}

// Same as generatePageHtml - no more separate preview function needed
export const generateSinglePageHtml = generatePageHtml

export { PDF_STYLES }
