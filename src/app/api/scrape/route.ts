import { NextResponse } from 'next/server'
import { scrapeThreads } from '@/lib/scraper'

export async function POST(request: Request) {
  try {
    const { username } = await request.json()

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    const posts = await scrapeThreads(username, 'scrape-job')

    return NextResponse.json({ posts })
  } catch (error) {
    console.error('[SCRAPE_API_ERROR]', error)
    return NextResponse.json({ error: 'Failed to scrape threads' }, { status: 500 })
  }
}
