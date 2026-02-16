import { ThreadsPost, ThreadsProfile, BookStructure } from '@loom/shared'
import { MergedPost, CaptionMap } from './types'
import { buildCaptionMap } from './utils'
import { ESSAY } from './constants'
import { PDF_STYLES } from './templates/styles'
import { generateCoverPage } from './templates/cover'
import { generateEssaySubChapterPage, generateEssayContinuationPage } from './templates/content'
import { generateTocPage } from './templates/toc'
import { generatePrefacePage } from './templates/preface'
import { generateChapterTitlePage } from './templates/chapter'
import { generateLastPage } from './templates/last'
export type { MergedPost } from './types'

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

// Generate page contents (array of page HTML strings)
// Generates essay-style book with TOC, preface, chapters
export function generatePageContents(
  posts: ThreadsPost[],
  profile: ThreadsProfile,
  bookStructure: BookStructure
): string[] {
  return generateEssayPageContents(posts, profile, bookStructure)
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

// Estimate the height of a single merged post
function estimateMergedPostHeight(post: MergedPost): number {
  let height = ESSAY.POST_HEADER_HEIGHT + ESSAY.POST_MARGIN

  // Text height
  const lines = post.content.split('\n')
  let totalLines = 0
  for (const line of lines) {
    totalLines += Math.max(Math.ceil(line.length / ESSAY.CHARS_PER_LINE), 1)
  }
  height += totalLines * ESSAY.LINE_HEIGHT

  // Image height
  height += post.imageUrls.length * ESSAY.IMAGE_HEIGHT

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
  let remainingHeight = ESSAY.CONTENT_HEIGHT - ESSAY.SUB_CHAPTER_TITLE_HEIGHT

  for (const post of mergedPosts) {
    const postHeight = estimateMergedPostHeight(post)

    if (currentGroup.length > 0 && postHeight > remainingHeight) {
      // This post would overflow; start a new page
      pageGroups.push(currentGroup)
      currentGroup = [post]
      // Subsequent pages have full content area
      remainingHeight = ESSAY.CONTENT_HEIGHT - postHeight
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

// Generate blank page for print-friendly spreads
function generateBlankPage(): string {
  return `<div class="page"></div>`
}
