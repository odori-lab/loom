export interface BookSubChapter {
  id: string
  title: string
  postIds: string[]
}

export interface BookChapter {
  id: string
  title: string
  description: string
  subChapters: BookSubChapter[]
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
