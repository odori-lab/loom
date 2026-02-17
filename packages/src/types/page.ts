export interface PageMeta {
  type:
    | "cover"
    | "blank"
    | "author"
    | "preface"
    | "toc"
    | "chapter-title"
    | "sub-chapter"
    | "post"
    | "last";
  chapterIndex?: number;
  chapterTitle?: string;
  subChapterIndex?: number;
  subChapterTitle?: string;
}

export interface StoredPage {
  html: string;
  meta: PageMeta;
  /** All block-level metas for this page (when multiple blocks share a page) */
  blockMetas?: PageMeta[];
}
