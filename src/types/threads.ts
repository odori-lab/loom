export interface ThreadsPost {
  id: string
  username: string
  content: string
  imageUrls: string[]
  likeCount: number
  replyCount: number
  repostCount: number
  postedAt: Date
}

export interface ThreadsProfile {
  username: string
  displayName: string
  bio: string
  followerCount: number
  profileImageUrl: string
}
