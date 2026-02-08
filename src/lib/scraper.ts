import { ThreadsPost, ThreadsProfile } from '@/types/threads'
import { chromium } from 'playwright'

interface ScrapeResult {
  posts: ThreadsPost[]
  profile: ThreadsProfile
  hasMore: boolean
}

interface ScrapeOptions {
  limit?: number
  cursor?: string
}

let browserInstance: any = null

async function getBrowser() {
  if (browserInstance) {
    return browserInstance
  }

  const isLocal = process.env.NODE_ENV === 'development'

  if (isLocal) {
    // Local development - use installed Chrome
    browserInstance = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    })
  } else {
    // Production (Vercel) - use bundled chromium
    browserInstance = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    })
  }

  return browserInstance
}

export async function scrapeThreads(
  username: string,
  options: ScrapeOptions = {}
): Promise<ScrapeResult> {
  const threadsUsername = process.env.THREADS_USERNAME
  const threadsPassword = process.env.THREADS_PASSWORD

  if (!threadsUsername || !threadsPassword) {
    throw new Error('THREADS_USERNAME and THREADS_PASSWORD environment variables are required')
  }

  const browser = await getBrowser()
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  })
  const page = await context.newPage()

  try {
    // Navigate to Threads login
    console.log('[SCRAPER] Navigating to Threads login...')
    await page.goto('https://www.threads.net/login', {
      waitUntil: 'networkidle',
      timeout: 30000,
    })

    // Wait for login form and enter credentials
    console.log('[SCRAPER] Logging in...')
    await page.waitForSelector('input[type="text"]', { timeout: 10000 })
    await page.fill('input[type="text"]', threadsUsername)
    await page.fill('input[type="password"]', threadsPassword)

    // Click login button
    await page.click('button[type="submit"]')
    await page.waitForLoadState('networkidle', { timeout: 30000 })

    // Navigate to user profile
    console.log(`[SCRAPER] Navigating to @${username} profile...`)
    await page.goto(`https://www.threads.net/@${username}`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    })

    // Wait for profile to load
    await page.waitForSelector('span[dir="auto"]', { timeout: 10000 })

    // Extract profile info
    const profile = await page.evaluate((uname: string) => {
      const displayNameEl = document.querySelector('h1 span[dir="auto"]')
      const bioEl = document.querySelector('div[dir="auto"][style*="line-height"]')
      const profileImgEl = document.querySelector('img[crossorigin="anonymous"]')
      const followerEl = Array.from(document.querySelectorAll('a[role="link"]')).find(
        (el) => el.textContent?.includes('followers')
      )

      return {
        username: uname,
        displayName: displayNameEl?.textContent || uname,
        bio: bioEl?.textContent || '',
        followerCount: followerEl
          ? parseInt(followerEl.textContent?.replace(/[^0-9]/g, '') || '0')
          : 0,
        profileImageUrl: (profileImgEl as HTMLImageElement)?.src || '',
      }
    }, username)

    console.log('[SCRAPER] Profile extracted:', profile)

    // Scroll and collect posts
    const limit = options.limit || 50
    let posts: ThreadsPost[] = []
    let lastHeight = 0
    let scrollAttempts = 0
    const maxScrollAttempts = 10

    console.log(`[SCRAPER] Collecting up to ${limit} posts...`)

    while (posts.length < limit && scrollAttempts < maxScrollAttempts) {
      // Extract posts from current viewport
      const newPosts = await page.evaluate((uname: string) => {
        const postElements = Array.from(document.querySelectorAll('div[role="button"]')).filter(
          (el) => {
            const text = el.textContent || ''
            return text.includes('ago') || text.includes('Like') || text.includes('Reply')
          }
        )

        return postElements.slice(0, 50).map((el, idx) => {
          const contentEl = el.querySelector('span[dir="auto"]')
          const timeEl = Array.from(el.querySelectorAll('time')).find((t) => t.dateTime)
          const likeEl = Array.from(el.querySelectorAll('span')).find((s) =>
            s.textContent?.toLowerCase().includes('like')
          )
          const replyEl = Array.from(el.querySelectorAll('span')).find((s) =>
            s.textContent?.toLowerCase().includes('repl')
          )

          // Extract images
          const imageEls = Array.from(el.querySelectorAll('img[src^="https://"]')).slice(0, 2)
          const imageUrls = imageEls
            .map((img) => (img as HTMLImageElement).src)
            .filter((src) => !src.includes('avatar') && !src.includes('profile'))

          return {
            id: `${uname}-${Date.now()}-${idx}`,
            username: uname,
            content: contentEl?.textContent || '',
            imageUrls: imageUrls,
            likeCount: parseInt(likeEl?.textContent?.replace(/[^0-9]/g, '') || '0'),
            replyCount: parseInt(replyEl?.textContent?.replace(/[^0-9]/g, '') || '0'),
            repostCount: 0,
            postedAt: timeEl?.dateTime || new Date().toISOString(),
          }
        })
      }, username)

      // Add new posts (deduplicate by content)
      const existingContents = new Set(posts.map((p) => p.content))
      const uniqueNewPosts = (newPosts as ThreadsPost[]).filter((p) => p.content && !existingContents.has(p.content))

      posts.push(...uniqueNewPosts)
      console.log(`[SCRAPER] Collected ${posts.length} unique posts so far...`)

      // Scroll down
      await page.evaluate(() => window.scrollBy(0, window.innerHeight))
      await page.waitForTimeout(1500)

      // Check if we've reached the bottom
      const newHeight = await page.evaluate(() => document.body.scrollHeight)
      if (newHeight === lastHeight) {
        scrollAttempts++
      } else {
        scrollAttempts = 0
      }
      lastHeight = newHeight
    }

    // Limit posts and sort by date
    posts = posts.slice(0, limit)
    posts.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime())

    console.log(`[SCRAPER] Successfully collected ${posts.length} posts`)

    return {
      posts,
      profile,
      hasMore: posts.length >= limit,
    }
  } catch (error) {
    console.error('[SCRAPER] Error:', error)
    throw error
  } finally {
    await page.close()
    await context.close()
  }
}

// Close browser on process exit
process.on('exit', async () => {
  if (browserInstance) {
    await browserInstance.close()
    browserInstance = null
  }
})
