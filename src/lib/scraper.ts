import puppeteer from 'puppeteer'
import { ThreadsPost } from '@/types/threads-post'

export async function scrapeThreads(username: string, jobId: string, onProgress?: (count: number) => void): Promise<ThreadsPost[]> {
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()

  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  )

  const posts: ThreadsPost[] = []

  try {
    await page.goto(`https://www.threads.net/@${username}`, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    })

    // Wait for posts to load
    await page.waitForSelector('[data-pressable-container="true"]', { timeout: 10000 }).catch(() => null)

    // Scroll and collect posts
    let previousHeight = 0
    let scrollAttempts = 0
    const maxScrollAttempts = 20

    while (scrollAttempts < maxScrollAttempts) {
      const newPosts = await page.evaluate(() => {
        const postElements = document.querySelectorAll('[data-pressable-container="true"]')
        return Array.from(postElements).map((el) => {
          const textEl = el.querySelector('[dir="auto"]')
          const imgEls = el.querySelectorAll('img[src*="scontent"]')
          const timeEl = el.querySelector('time')

          return {
            content: textEl?.textContent || '',
            imageUrls: Array.from(imgEls).map((img) => (img as HTMLImageElement).src),
            postedAt: timeEl?.getAttribute('datetime') || new Date().toISOString(),
          }
        })
      })

      for (const post of newPosts) {
        if (post.content && !posts.some((p) => p.content === post.content)) {
          posts.push({
            id: crypto.randomUUID(),
            jobId,
            content: post.content,
            imageUrls: post.imageUrls,
            postedAt: new Date(post.postedAt),
            scrapedAt: new Date(),
          })
          onProgress?.(posts.length)
        }
      }

      await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2))
      await new Promise((r) => setTimeout(r, 1500))

      const currentHeight = await page.evaluate(() => document.body.scrollHeight)
      if (currentHeight === previousHeight) break
      previousHeight = currentHeight
      scrollAttempts++
    }
  } finally {
    await browser.close()
  }

  return posts
}
