import { ThreadsPost, ThreadsProfile } from '@/types/threads'

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

export async function createLoomPdf(
  posts: ThreadsPost[],
  profile: ThreadsProfile,
  userId: string
): Promise<{ pdfPath: string; loomId: string }> {
  const { url: workerUrl, headers } = getWorkerConfig()

  console.log(`[PDF] Sending ${posts.length} posts to worker for loom creation...`)

  const response = await fetch(`${workerUrl}/create-loom`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ posts, profile, userId }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(
      `Worker create-loom failed (${response.status}): ${errorData.error || errorData.message || 'Unknown error'}`
    )
  }

  return response.json()
}
