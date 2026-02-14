import { generatePageHtml } from './generator'

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

export async function renderPagesToPdf(pages: string[]): Promise<Buffer> {
  const { url: workerUrl, headers } = getWorkerConfig()

  // Wrap each page content in full HTML document
  const fullPages = pages.map((pageContent) => generatePageHtml(pageContent))

  console.log(`[PDF] Sending ${fullPages.length} pages to worker for rendering...`)

  const response = await fetch(`${workerUrl}/generate-pdf`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ pages: fullPages }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(
      `Worker PDF generation failed (${response.status}): ${errorData.error || errorData.message || 'Unknown error'}`
    )
  }

  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
