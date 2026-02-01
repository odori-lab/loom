export interface ThreadsPost {
  id: string
  jobId: string
  content: string
  imageUrls: string[]
  likeCount?: number
  replyCount?: number
  postedAt: Date
  scrapedAt: Date
}
