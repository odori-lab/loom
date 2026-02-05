import { NextResponse } from 'next/server'
import puppeteer from 'puppeteer'
import { PDFDocument } from 'pdf-lib'
import { ThreadsPost, ThreadsProfile } from '@/types/threads'
import { generatePageContents, generatePageHtml } from '@/lib/pdf/generator'
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

    // Generate page contents (same as preview uses)
    const pages = generatePageContents(posts, profile)
    const sessionId = crypto.randomUUID()
    const pdfPath = path.join(DOWNLOADS_DIR, `${sessionId}.pdf`)

    // Generate PDF using Puppeteer - render each page individually
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    // Create merged PDF document
    const mergedPdf = await PDFDocument.create()

    for (const pageContent of pages) {
      const page = await browser.newPage()
      
      // Use the same HTML generation as preview (without scale)
      const htmlContent = generatePageHtml(pageContent)
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' })

      // Generate PDF for this single page
      const pdfBuffer = await page.pdf({
        width: '148mm',
        height: '210mm',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      })

      // Add page to merged PDF
      const pagePdf = await PDFDocument.load(pdfBuffer)
      const [copiedPage] = await mergedPdf.copyPages(pagePdf, [0])
      mergedPdf.addPage(copiedPage)

      await page.close()
    }

    await browser.close()

    // Save merged PDF
    const mergedPdfBytes = await mergedPdf.save()
    fs.writeFileSync(pdfPath, mergedPdfBytes)

    const downloadUrl = `/downloads/${sessionId}.pdf`
    return NextResponse.json({ downloadUrl, sessionId })
  } catch (error) {
    console.error('[PDF_GENERATION_ERROR]', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
