export interface BookSubChapter {
  id: string
  title: string
  postIds: string[]
  startPage?: number
}

export interface BookChapter {
  id: string
  title: string
  description: string
  subChapters: BookSubChapter[]
  startPage?: number
}

export interface ImageCaption {
  postId: string
  caption: string
}

export interface BookStructure {
  title: string
  preface: string
  chapters: BookChapter[]
  imageCaptions?: ImageCaption[]
}
