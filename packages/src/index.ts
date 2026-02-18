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

// PDF constants
export {
  PAGE_WIDTH,
  PAGE_HEIGHT,
  PAGE_PADDING_TOP,
  PAGE_PADDING_SIDE,
  MAX_PAGE_HEIGHT,
  SAFE_PAGE_HEIGHT,
  IMAGE_LOAD_TIMEOUT,
  IMAGE_FALLBACK_HEIGHTS,
  DEFAULT_IMAGE_FALLBACK,
  ESSAY,
  PRETENDARD_FONT_LINK,
} from "./pdf/constants";

// PDF templates
export { generateCoverPage } from "./pdf/templates/cover";
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

// PDF spreads
export { calculateSpreads } from "./pdf/spreads";
export type { SpreadData } from "./pdf/spreads";

// PDF generator
export {
  generatePageHtml,
  generateAllPagesHtml,
  generateEssayPageContents,
  estimateMergedPostHeight,
  splitSubChapterIntoPages,
  generateBlankPage,
} from "./pdf/generator";
export type { GeneratePageHtmlOptions } from "./pdf/generator";
