import type { ThreadsPost, ThreadsProfile } from "../types/threads";
import type { BookStructure } from "../types/book";
import type { MergedPost, CaptionMap } from "../types/pdf";
import { mergeThreadPosts, buildCaptionMap } from "./merge";
import { PDF_STYLES } from "./styles";
import { generateCoverPage } from "./templates/cover";
import { generateTocPage } from "./templates/toc";
import { generatePrefacePage } from "./templates/preface";
import { generateChapterTitlePage } from "./templates/chapter";
import { generateLastPage } from "./templates/last";
import {
  generateEssaySubChapterPage,
  generateEssayContinuationPage,
} from "./templates/content";
import { ESSAY } from "./constants";

export interface GeneratePageHtmlOptions {
  fontLink?: string;
}

// Generate HTML for a single page
export function generatePageHtml(
  pageContent: string,
  options?: GeneratePageHtmlOptions,
): string {
  const fontLinkHtml = options?.fontLink ?? "";
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        ${fontLinkHtml}
        <style>${PDF_STYLES}</style>
      </head>
      <body>
        ${pageContent}
      </body>
    </html>
  `;
}

// Generate a single HTML document containing all pages (optimized for single-pass PDF rendering)
export function generateAllPagesHtml(
  pageContents: string[],
  options?: GeneratePageHtmlOptions,
): string {
  const fontLinkHtml = options?.fontLink ?? "";
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        ${fontLinkHtml}
        <style>
          ${PDF_STYLES}
          .page { page-break-after: always; }
          .page:last-child { page-break-after: auto; }
        </style>
      </head>
      <body>
        ${pageContents.join("\n")}
      </body>
    </html>
  `;
}

// Estimate the height of a single merged post
export function estimateMergedPostHeight(post: MergedPost): number {
  let height = ESSAY.POST_HEADER_HEIGHT + ESSAY.POST_MARGIN;

  // Text height
  const lines = post.content.split("\n");
  let totalLines = 0;
  for (const line of lines) {
    totalLines += Math.max(Math.ceil(line.length / ESSAY.CHARS_PER_LINE), 1);
  }
  height += totalLines * ESSAY.LINE_HEIGHT;

  // Image height
  height += post.imageUrls.length * ESSAY.IMAGE_HEIGHT;

  return height;
}

// Split merged posts into page groups, returning page HTML strings
export function splitSubChapterIntoPages(
  subChapterTitle: string,
  mergedPosts: MergedPost[],
  chapterIdx: number,
  subIdx: number,
  captionMap?: CaptionMap,
): string[] {
  const pageGroups: MergedPost[][] = [];
  let currentGroup: MergedPost[] = [];
  // First page has less space due to sub-chapter title
  let remainingHeight = ESSAY.CONTENT_HEIGHT - ESSAY.SUB_CHAPTER_TITLE_HEIGHT;

  for (const post of mergedPosts) {
    const postHeight = estimateMergedPostHeight(post);

    if (currentGroup.length > 0 && postHeight > remainingHeight) {
      // This post would overflow; start a new page
      pageGroups.push(currentGroup);
      currentGroup = [post];
      // Subsequent pages have full content area
      remainingHeight = ESSAY.CONTENT_HEIGHT - postHeight;
    } else {
      currentGroup.push(post);
      remainingHeight -= postHeight;
    }
  }

  // Push the last group
  if (currentGroup.length > 0) {
    pageGroups.push(currentGroup);
  }

  // Generate HTML for each page group
  return pageGroups.map((group, i) => {
    if (i === 0) {
      // First page: includes sub-chapter title
      return generateEssaySubChapterPage(
        subChapterTitle,
        group,
        chapterIdx,
        subIdx,
        captionMap,
      );
    } else {
      // Continuation pages: just posts, no title
      return generateEssayContinuationPage(group, captionMap);
    }
  });
}

// Generate blank page for print-friendly spreads
export function generateBlankPage(): string {
  return `<div class="page"></div>`;
}

// Essay-style book page generation
export function generateEssayPageContents(
  posts: ThreadsPost[],
  profile: ThreadsProfile,
  bookStructure: BookStructure,
): string[] {
  const pages: string[] = [];

  // Build a map of postId -> post for quick lookup
  const postMap = new Map<string, ThreadsPost>();
  for (const post of posts) {
    postMap.set(post.id, post);
  }

  // Build caption lookup map: postId -> caption
  const captionMap: CaptionMap = buildCaptionMap(bookStructure.imageCaptions);

  // 1. Cover page with book title
  pages.push(generateCoverPage(profile, bookStructure.title));

  // 2. Table of Contents page (wrapped in page div)
  pages.push(`<div class="page toc-page">${generateTocPage(bookStructure)}</div>`);

  // 3. Preface page
  if (bookStructure.preface) {
    pages.push(generatePrefacePage(bookStructure.preface));
  }

  // 4. For each chapter: chapter title page + sub-chapter content pages
  for (
    let chapterIdx = 0;
    chapterIdx < bookStructure.chapters.length;
    chapterIdx++
  ) {
    const chapter = bookStructure.chapters[chapterIdx]!;

    // Chapter title page
    pages.push(generateChapterTitlePage(chapter, chapterIdx));

    // For each sub-chapter: generate content pages with overflow splitting
    for (let subIdx = 0; subIdx < chapter.subChapters.length; subIdx++) {
      const subChapter = chapter.subChapters[subIdx]!;

      // Gather posts for this sub-chapter
      const subChapterPosts: ThreadsPost[] = [];
      for (const postId of subChapter.postIds) {
        const post = postMap.get(postId);
        if (post) {
          subChapterPosts.push(post);
        }
      }

      if (subChapterPosts.length === 0) continue;

      // Merge posts by threadId
      const mergedPosts = mergeThreadPosts(subChapterPosts);

      // Split into pages if content overflows
      const subChapterPages = splitSubChapterIntoPages(
        subChapter.title,
        mergedPosts,
        chapterIdx,
        subIdx,
        captionMap,
      );
      pages.push(...subChapterPages);
    }
  }

  // Add blank page if total content pages (excluding cover and last) are odd
  const contentPageCount = pages.length - 1; // subtract cover
  if (contentPageCount % 2 === 1) {
    pages.push(generateBlankPage());
  }

  // 5. Last page
  pages.push(generateLastPage());

  return pages;
}
