import { ThreadsPost, ThreadsProfile } from '@/types/threads'

interface ScrapeResult {
  posts: ThreadsPost[]
  profile: ThreadsProfile
  hasMore: boolean
}

interface ScrapeOptions {
  limit?: number
  cursor?: string
}

interface WorkerResponse {
  success: boolean
  profile?: {
    username: string
    displayName: string
    bio: string
    profileImageUrl: string
  }
  posts?: Array<{
    id: string
    username: string
    content: string
    imageUrls: string[]
    likeCount: number
    replyCount: number
    repostCount: number
    postedAt: string
    threadId?: string
  }>
  error?: string
  accountId?: string
  duration?: number
}

function getWorkerConfig() {
  const url = process.env.LOOM_WORKER_URL
  if (!url) {
    throw new Error(
      'LOOM_WORKER_URL environment variable is not set. ' +
      'Set it to the base URL of the loom-worker service (e.g. http://localhost:3001).'
    )
  }
  const apiKey = process.env.WORKER_API_KEY
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`
  }
  return { url: url.replace(/\/+$/, ''), headers }
}

export async function scrapeThreads(
  username: string,
  options: ScrapeOptions = {}
): Promise<ScrapeResult> {
  const { url: workerUrl, headers } = getWorkerConfig()
  const limit = options.limit || 50

  console.log(`[SCRAPER] Requesting @${username} from worker (limit: ${limit})...`)

  const response = await fetch(`${workerUrl}/scrape`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ username, limit }),
  })

  if (!response.ok && response.status !== 503) {
    const text = await response.text().catch(() => 'No response body')
    throw new Error(
      `Worker request failed with status ${response.status}: ${text}`
    )
  }

  const data: WorkerResponse = await response.json()

  if (!data.success) {
    throw new Error(
      `Worker scrape failed for @${username}: ${data.error || 'Unknown error'}` +
      (data.accountId ? ` (account: ${data.accountId})` : '') +
      (data.duration ? ` (took ${data.duration}ms)` : '')
    )
  }

  if (!data.profile || !data.posts) {
    throw new Error(
      `Worker returned success but missing profile or posts for @${username}`
    )
  }

  const profile: ThreadsProfile = {
    username: data.profile.username,
    displayName: data.profile.displayName,
    bio: data.profile.bio,
    followerCount: 0,
    profileImageUrl: data.profile.profileImageUrl,
  }

  const posts: ThreadsPost[] = data.posts.map((post) => ({
    id: post.id,
    username: post.username,
    content: post.content,
    imageUrls: post.imageUrls,
    likeCount: post.likeCount,
    replyCount: post.replyCount,
    repostCount: post.repostCount,
    postedAt: new Date(post.postedAt),
    ...(post.threadId ? { threadId: post.threadId } : {}),
  }))

  console.log(
    `[SCRAPER] Received ${posts.length} posts for @${username}` +
    (data.duration ? ` (took ${data.duration}ms)` : '')
  )

  return {
    posts,
    profile,
    hasMore: posts.length >= limit,
  }
}
