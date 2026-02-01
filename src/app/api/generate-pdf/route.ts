import { NextResponse } from 'next/server'
import puppeteer from 'puppeteer'
import { ThreadsPost } from '@/types/threads-post'
import fs from 'fs'
import path from 'path'

const DOWNLOADS_DIR = path.join(process.cwd(), 'public', 'downloads')

function ensureDownloadsDir() {
  if (!fs.existsSync(DOWNLOADS_DIR)) {
    fs.mkdirSync(DOWNLOADS_DIR, { recursive: true })
  }
}

function getPostHTML(post: ThreadsPost) {
  return `
    <div class="post">
      <p>${post.content}</p>
      <div class="timestamp">${new Date(post.postedAt).toLocaleString()}</div>
    </div>
  `
}

function getPDFTemplate(username: string, posts: ThreadsPost[]) {
  const postsHTML = posts.map(getPostHTML).join('')

  return `
    <html>
      <head>
        <style>
          body { font-family: sans-serif; background-color: #101010; color: #f1f1f1; padding: 2rem; }
          .post { border: 1px solid #303030; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
          .timestamp { font-size: 0.8rem; color: #808080; margin-top: 0.5rem; }
          h1 { font-size: 2rem; margin-bottom: 0.5rem; }
        </style>
      </head>
      <body>
        <h1>@${username}</h1>
        ${postsHTML}
      </body>
    </html>
  `
}

export async function POST(request: Request) {
  try {
    const { username, posts } = await request.json()

    if (!username || !posts || !Array.isArray(posts)) {
      return NextResponse.json({ error: 'Username and posts are required' }, { status: 400 })
    }

    ensureDownloadsDir()

    const htmlContent = getPDFTemplate(username, posts)
    const sessionId = crypto.randomUUID()
    const pdfPath = path.join(DOWNLOADS_DIR, `${sessionId}.pdf`)

    const browser = await puppeteer.launch({ headless: true })
    const page = await browser.newPage()
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' })
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '1in', right: '1in', bottom: '1in', left: '1in' },
    })
    await browser.close()

    const downloadUrl = `/downloads/${sessionId}.pdf`
    return NextResponse.json({ downloadUrl })
  } catch (error) {
    console.error('[PDF_GENERATION_ERROR]', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
