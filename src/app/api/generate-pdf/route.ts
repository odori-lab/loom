import { NextResponse } from 'next/server'
import puppeteer from 'puppeteer'
import { ThreadsPost, ThreadsProfile } from '@/types/threads'
import { generatePdfHtml } from '@/lib/pdf/generator'
import fs from 'fs'
import path from 'path'

const DOWNLOADS_DIR = path.join(process.cwd(), 'public', 'downloads')

function ensureDownloadsDir() {
  if (!fs.existsSync(DOWNLOADS_DIR)) {
    fs.mkdirSync(DOWNLOADS_DIR, { recursive: true })
  }
}

export async function POST(request: Request) {
  try {
    const { posts, profile } = await request.json() as {
      posts: ThreadsPost[]
      profile: ThreadsProfile
    }

    if (!posts || !Array.isArray(posts) || posts.length === 0) {
      return NextResponse.json({ error: 'Posts are required' }, { status: 400 })
    }

    if (!profile) {
      return NextResponse.json({ error: 'Profile is required' }, { status: 400 })
    }

    ensureDownloadsDir()

    // Generate HTML content
    const htmlContent = generatePdfHtml(posts, profile)
    const sessionId = crypto.randomUUID()
    const pdfPath = path.join(DOWNLOADS_DIR, `${sessionId}.pdf`)

    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    const page = await browser.newPage()
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' })

    await page.pdf({
      path: pdfPath,
      width: '148mm',
      height: '210mm',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })

    await browser.close()

    const downloadUrl = `/downloads/${sessionId}.pdf`
    return NextResponse.json({ downloadUrl, sessionId })
  } catch (error) {
    console.error('[PDF_GENERATION_ERROR]', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
