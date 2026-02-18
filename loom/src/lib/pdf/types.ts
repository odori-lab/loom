// ─── Content block types (from content-blocks.ts) ───

export interface ContentBlock {
  id: string;
  html: string;
  type:
    | "cover"
    | "toc"
    | "preface"
    | "author"
    | "chapter-title"
    | "sub-chapter"
    | "post"
    | "last"
    | "blank";
  fullPage?: boolean;
  chapterIndex?: number;
  chapterTitle?: string;
  subChapterIndex?: number;
  subChapterTitle?: string;
}

// ─── Measurement types (from measure.ts) ───

export interface MeasuredBlock extends ContentBlock {
  measuredHeight: number;
}

// Maps block ID to its 1-based page number
export type PageMapping = Map<string, number>;

// ─── Layout types (re-exported from @loom/shared) ───

export type { CaptionMap, MergedPost } from "@loom/shared";
