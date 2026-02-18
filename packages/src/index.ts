// Types

// Format utilities
export { escapeHtml, formatDate, formatNumber } from "./format";
// PDF constants
export {
  DEFAULT_IMAGE_FALLBACK,
  ESSAY,
  IMAGE_FALLBACK_HEIGHTS,
  IMAGE_LOAD_TIMEOUT,
  MAX_PAGE_HEIGHT,
  PAGE_HEIGHT,
  PAGE_PADDING_SIDE,
  PAGE_PADDING_TOP,
  PAGE_WIDTH,
  PRETENDARD_FONT_LINK,
  SAFE_PAGE_HEIGHT,
} from "./pdf/constants";
export type { GeneratePageHtmlOptions } from "./pdf/generator";
// PDF generator
export {
  estimateMergedPostHeight,
  generateAllPagesHtml,
  generateBlankPage,
  generateEssayPageContents,
  generatePageHtml,
  splitSubChapterIntoPages,
} from "./pdf/generator";
// PDF utilities
export { LOOM_LOGO_IMG, LOOM_LOGO_SVG } from "./pdf/logo";
export { buildCaptionMap, mergeThreadPosts } from "./pdf/merge";
export type { SpreadData } from "./pdf/spreads";
// PDF spreads
export { calculateSpreads } from "./pdf/spreads";
export { PDF_STYLES } from "./pdf/styles";
export {
  generateChapterTitlePage,
  generateSubChapterTitle,
} from "./pdf/templates/chapter";
export {
  generateEssayContinuationPage,
  generateEssaySubChapterPage,
} from "./pdf/templates/content";
// PDF templates
export { generateCoverPage } from "./pdf/templates/cover";
export { generateLastPage } from "./pdf/templates/last";
export { generatePrefacePage } from "./pdf/templates/preface";
export type { PageMapping } from "./pdf/templates/toc";
export { generateTocPage } from "./pdf/templates/toc";
export type {
  BookChapter,
  BookStructure,
  BookSubChapter,
  ImageCaption,
} from "./types/book";
export type { Database, Json } from "./types/database";
export type { CoverData, Loom } from "./types/loom";
export type { PageMeta, StoredPage } from "./types/page";
export type { CaptionMap, MergedPost } from "./types/pdf";
export type { ThreadsPost, ThreadsProfile } from "./types/threads";
