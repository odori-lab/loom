import { NextRequest, NextResponse } from 'next/server'
import { createJob, updateJob } from '@/lib/job-store'
import { scrapeThreads } from '@/lib/scraper'
import { generatePdf } from '@/lib/pdf-generator'

const USERNAME_REGEX = /^[a-zA-Z0-9._]{1,30}$/

const rateLimit = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW = 60_000
const RATE_LIMIT_MAX = 5

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimit.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return false
  }
  entry.count++
  return entry.count > RATE_LIMIT_MAX
}

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status })
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  if (isRateLimited(ip)) {
    return errorResponse('RATE_LIMITED', 'Too many requests. Please try again later.', 429)
  }

  const { threadsUsername } = await req.json()

  if (!threadsUsername || typeof threadsUsername !== 'string' || !USERNAME_REGEX.test(threadsUsername)) {
    return errorResponse('INVALID_USERNAME', 'Invalid Threads username', 400)
  }

  // Skip Stripe: create a fake session ID and start processing directly
  const sessionId = crypto.randomUUID()
  const job = createJob(sessionId, threadsUsername)

  // Process asynchronously
  processJob(sessionId, threadsUsername, job.id).catch(console.error)

  return NextResponse.json({ sessionId })
}

async function processJob(sessionId: string, username: string, jobId: string) {
  try {
    updateJob(sessionId, { status: 'scraping' })

    const posts = await scrapeThreads(username, jobId, (count) => {
      updateJob(sessionId, { postCount: count })
    })

    if (posts.length === 0) {
      throw new Error('No posts found for this user')
    }

    updateJob(sessionId, { status: 'generating_pdf', postCount: posts.length })

    const pdfUrl = await generatePdf(username, posts, sessionId)

    updateJob(sessionId, { status: 'completed', pdfUrl })
  } catch (error) {
    updateJob(sessionId, {
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
