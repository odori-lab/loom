import { ThreadsPost } from '@/types/threads-post'

export async function scrapeThreads(username: string, jobId: string): Promise<ThreadsPost[]> {
  const apifyToken = process.env.APIFY_TOKEN
  if (!apifyToken) {
    throw new Error('APIFY_TOKEN environment variable is not set')
  }

  const response = await fetch(`https://api.apify.com/v2/acts/canadesk~threads/run-sync-get-dataset-items?token=${apifyToken}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      keyword: [username],
      process: 'gt', // get threads for a user
      maximum: 50,
      proxy: {
        useApifyProxy: true,
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`Failed to scrape threads from Apify: ${response.status} ${errorText}`)
    throw new Error(`Failed to scrape threads from Apify: ${response.status} ${errorText}`)
  }

  const result: any[] = await response.json()

  // The actual posts are nested inside the first element of the result array
  const apifyThreads = result?.[0]?.data?.threads

  if (!apifyThreads || !Array.isArray(apifyThreads)) {
    console.log('No threads found in the expected format from Apify.')
    return []
  }

  const posts: ThreadsPost[] = apifyThreads.map((post: any) => ({
    id: post.id || crypto.randomUUID(),
    jobId,
    content: post.text || '',
    imageUrls: post.media?.map((m: any) => m.url) || [],
    // Convert Unix timestamp (seconds) to milliseconds for Date object
    postedAt: new Date(post.timestamp * 1000),
    scrapedAt: new Date(),
  }))

  return posts
}
