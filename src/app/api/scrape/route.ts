import { NextResponse } from 'next/server'
import { scrapeThreads } from '@/lib/scraper'

export async function POST(request: Request) {
  try {
    const { username } = await request.json()

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    // Clean username (remove @ if present)
    const cleanUsername = username.replace(/^@/, '').trim()

    const { posts, profile } = await scrapeThreads(cleanUsername)

    return NextResponse.json({ posts, profile })
  } catch (error: any) {
    console.error('[SCRAPE_ERROR]', error)
    return NextResponse.json(
      { error: error.message || 'Failed to scrape threads' },
      { status: 500 }
    )
  }
}
