import {
  ThreadsPost,
  ThreadsProfile,
  BookStructure,
  generatePageHtml as sharedGeneratePageHtml,
  generateEssayPageContents,
  PRETENDARD_FONT_LINK,
} from "@loom/shared";

// Re-export for existing consumers
export { mergeThreadPosts } from "@loom/shared";
export type { MergedPost } from "@loom/shared";

// Generate HTML for a single page (used by both PDF and Preview)
export function generatePageHtml(pageContent: string): string {
  return sharedGeneratePageHtml(pageContent, { fontLink: PRETENDARD_FONT_LINK });
}

// Generate page contents (array of page HTML strings)
// Generates essay-style book with TOC, preface, chapters
export function generatePageContents(
  posts: ThreadsPost[],
  profile: ThreadsProfile,
  bookStructure: BookStructure,
): string[] {
  return generateEssayPageContents(posts, profile, bookStructure);
}
