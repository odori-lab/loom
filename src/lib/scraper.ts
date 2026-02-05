import { ThreadsPost, ThreadsProfile } from '@/types/threads'

interface ScrapeResult {
  posts: ThreadsPost[]
  profile: ThreadsProfile
}

export async function scrapeThreads(username: string): Promise<ScrapeResult> {
  const apifyToken = process.env.APIFY_TOKEN
  if (!apifyToken) {
    throw new Error('APIFY_TOKEN environment variable is not set')
  }

  const response = await fetch(
    `https://api.apify.com/v2/acts/canadesk~threads/run-sync-get-dataset-items?token=${apifyToken}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        keyword: [username],
        process: 'gt', // get threads for a user
        maximum: 100,
        proxy: {
          useApifyProxy: true,
        },
      }),
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`Failed to scrape threads from Apify: ${response.status} ${errorText}`)
    throw new Error(`Failed to scrape threads: ${response.status}`)
  }

  const result: any[] = await response.json()

  const userData = result?.[0]?.data
  if (!userData) {
    throw new Error('No data found for this user')
  }

  // Extract profile info
  const profile: ThreadsProfile = {
    username: userData.username || username,
    displayName: userData.fullName || userData.username || username,
    bio: userData.bio || '',
    followerCount: userData.followerCount || 0,
    profileImageUrl: userData.profilePicUrl || '',
  }

  // Extract posts
  const apifyThreads = userData.threads || []
  if (!Array.isArray(apifyThreads)) {
    return { posts: [], profile }
  }

  const posts: ThreadsPost[] = apifyThreads.map((post: any) => ({
    id: post.id || crypto.randomUUID(),
    username: profile.username,
    content: post.text || '',
    imageUrls: extractImageUrls(post),
    likeCount: post.like_count || 0,
    replyCount: post.direct_reply_count || 0,
    repostCount: post.repost_count || 0,
    postedAt: new Date(post.timestamp * 1000),
  }))

  // Sort by date (newest first)
  posts.sort((a, b) => b.postedAt.getTime() - a.postedAt.getTime())

  return { posts, profile }
}

// TODO: image 제대로 불러와야 댐
function extractImageUrls(post: any): string[] {
  const urls: string[] = []

  // Try medias array
  if (post.medias && Array.isArray(post.medias)) {
    for (const media of post.medias) {
      if (media.url) {
        urls.push(media.url)
      }
    }
  }

  // Try media array (alternative format)
  if (post.media && Array.isArray(post.media)) {
    for (const media of post.media) {
      if (media.url) {
        urls.push(media.url)
      }
    }
  }

  // Limit to first 2 images as per design spec
  return urls.slice(0, 2)
}
