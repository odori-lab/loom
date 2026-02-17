// Types
export type { ThreadsPost, ThreadsProfile } from "./types/threads";
export type { Loom, CoverData } from "./types/loom";
export type {
  BookSubChapter,
  BookChapter,
  ImageCaption,
  BookStructure,
} from "./types/book";
export type { Json, Database } from "./types/database";
export type { PageMeta, StoredPage } from "./types/page";
export type { MergedPost, CaptionMap } from "./types/pdf";

// Format utilities
export { formatNumber, escapeHtml, formatDate } from "./format";

// PDF utilities
export { LOOM_LOGO_IMG, LOOM_LOGO_SVG } from "./pdf/logo";
export { PDF_STYLES } from "./pdf/styles";
export { mergeThreadPosts, buildCaptionMap } from "./pdf/merge";
export type { PageMapping } from "./pdf/templates/toc";

// PDF templates
export { generateLastPage } from "./pdf/templates/last";
export {
  generateChapterTitlePage,
  generateSubChapterTitle,
} from "./pdf/templates/chapter";
export { generatePrefacePage } from "./pdf/templates/preface";
export { generateTocPage } from "./pdf/templates/toc";
export {
  generateEssaySubChapterPage,
  generateEssayContinuationPage,
} from "./pdf/templates/content";
