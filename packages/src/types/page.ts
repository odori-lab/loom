export interface PageMeta {
  type:
    | "cover"
    | "blank"
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
}
