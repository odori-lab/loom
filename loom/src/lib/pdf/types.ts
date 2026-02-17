// ─── Content block types (from content-blocks.ts) ───

export interface ContentBlock {
  id: string;
  html: string;
  type:
    | "cover"
    | "toc"
    | "preface"
    | "chapter-title"
    | "sub-chapter"
    | "post"
    | "last"
    | "blank";
  fullPage?: boolean;
}

// ─── Measurement types (from measure.ts) ───

export interface MeasuredBlock extends ContentBlock {
  measuredHeight: number;
}

// Maps block ID to its 1-based page number
export type PageMapping = Map<string, number>;

// ─── Layout types ───

// Merged post type for combining thread posts in essay mode
export interface MergedPost {
  content: string;
  date: Date;
  likeCount: number;
  imageUrls: string[];
  postIds?: string[];
}

// ─── Caption map type (from content.ts / content-blocks.ts) ───

// Caption map type: postId -> caption (one caption per post)
export type CaptionMap = Map<string, string>;
