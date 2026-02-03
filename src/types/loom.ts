export interface Loom {
  id: string
  userId: string
  threadUsername: string
  threadDisplayName: string | null
  postCount: number
  pdfPath: string
  coverData: CoverData | null
  createdAt: Date
}

export interface CoverData {
  name: string
  username: string
  bio: string
  profileImageUrl: string
  followerCount?: number
}
