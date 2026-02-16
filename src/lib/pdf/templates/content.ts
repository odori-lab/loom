import { ThreadsProfile } from '@/types/threads'
import { MergedPost, CaptionMap } from '../types'
import { formatNumber, escapeHtml, formatDate } from '@/lib/utils/format'
import { generateSubChapterTitle } from './chapter'

// Re-export CaptionMap for backward compatibility
export type { CaptionMap } from '../types'

// Generate essay-style sub-chapter page with merged posts and inline images
export function generateEssaySubChapterPage(
  subChapterTitle: string,
  mergedPosts: MergedPost[],
  profile: ThreadsProfile,
  chapterIndex?: number,
  subIndex?: number,
  captionMap?: CaptionMap
): string {
  const titleHtml = generateSubChapterTitle(subChapterTitle, chapterIndex, subIndex)
  const postsHtml = mergedPosts.map(post => generateMergedPostHtml(post, captionMap)).join('')

  return `
    <div class="page">
      ${titleHtml}
      ${postsHtml}
    </div>
  `
}

// Generate essay continuation page (no sub-chapter title, just posts)
export function generateEssayContinuationPage(mergedPosts: MergedPost[], captionMap?: CaptionMap): string {
  const postsHtml = mergedPosts.map(post => generateMergedPostHtml(post, captionMap)).join('')

  return `
    <div class="page">
      ${postsHtml}
    </div>
  `
}

// Generate HTML for a merged post with inline images between paragraphs
function generateMergedPostHtml(post: MergedPost, captionMap?: CaptionMap): string {
  const dateStr = formatDate(post.date)

  // Header: date + likes (hide like count if 0)
  const likesStr = post.likeCount > 0 ? ` &middot; &#9829; ${formatNumber(post.likeCount)}` : ''
  const headerHtml = `<div class="essay-post-header">${dateStr}${likesStr}</div>`

  // Find caption for this post (one caption per post, covering all images)
  let caption: string | undefined
  if (captionMap && post.postIds) {
    for (const postId of post.postIds) {
      const found = captionMap.get(postId)
      if (found) { caption = found; break }
    }
  }

  // Split content into paragraphs and interleave images
  const contentHtml = generateInlineContent(post.content, post.imageUrls, caption)

  return `
    <div class="essay-post">
      ${headerHtml}
      ${contentHtml}
    </div>
  `
}

// Render all images for a post as a horizontal row, with optional single caption
function renderImagesHtml(imageUrls: string[], caption?: string): string {
  const imgsHtml = imageUrls.map(url => `<img src="${url}" alt="" class="essay-inline-image" />`).join('')
  const captionHtml = caption ? `<figcaption class="essay-image-caption">${escapeHtml(caption)}</figcaption>` : ''
  return `<figure class="essay-figure"><div class="essay-image-row">${imgsHtml}</div>${captionHtml}</figure>`
}

// Generate content with images inline between paragraphs
function generateInlineContent(content: string, imageUrls: string[], caption?: string): string {
  if (imageUrls.length === 0) {
    return `<div class="essay-post-text">${escapeHtml(content)}</div>`
  }

  const paragraphs = content.split('\n\n')

  if (paragraphs.length <= 1) {
    // Single paragraph: text then all images in a row
    return `<div class="essay-post-text">${escapeHtml(content)}</div>${renderImagesHtml(imageUrls, caption)}`
  }

  // Multiple paragraphs: place all images after the first paragraph
  const result: string[] = []
  for (let i = 0; i < paragraphs.length; i++) {
    result.push(`<div class="essay-post-text">${escapeHtml(paragraphs[i])}</div>`)
    if (i === 0) {
      result.push(renderImagesHtml(imageUrls, caption))
    }
  }

  return result.join('')
}
