// ─── Page dimensions (A5 at 96dpi) ───
// 148mm * 96 / 25.4 ≈ 559px, 210mm * 96 / 25.4 ≈ 793px
export const PAGE_WIDTH = 559;
export const PAGE_HEIGHT = 793;

// Content area height: page height minus top/bottom padding (22mm * 2 = ~166px)
// 210mm - 44mm = 166mm → 166 * 96 / 25.4 ≈ 627px
export const PAGE_PADDING_TOP = 83; // 22mm
export const PAGE_PADDING_SIDE = 76; // 20mm
export const MAX_PAGE_HEIGHT = 627;
export const SAFE_PAGE_HEIGHT = MAX_PAGE_HEIGHT - 15; // 612px

// ─── Image measurement ───
export const IMAGE_LOAD_TIMEOUT = 2000;

// Default fallback heights for images that fail to load during measurement
// These match the CSS max-height values in styles.ts
export const IMAGE_FALLBACK_HEIGHTS: Record<string, number> = {
  "essay-inline-image": 200,
};
export const DEFAULT_IMAGE_FALLBACK = 200;

// ─── Essay layout constants ───
export const ESSAY = {
  CONTENT_HEIGHT: 627,
  SUB_CHAPTER_TITLE_HEIGHT: 40,
  POST_HEADER_HEIGHT: 24,
  POST_MARGIN: 20,
  LINE_HEIGHT: 24, // 10pt * 1.7 line-height ≈ 23px, rounded up
  CHARS_PER_LINE: 30, // content area ~108mm at 10pt
  IMAGE_HEIGHT: 224, // max-height 200px + margin 24px
} as const;
