import { NextResponse } from 'next/server'
import { generatePageContents } from '@/lib/pdf/generator'
import { renderPagesToPdf } from '@/lib/pdf/render'
import { parseLoomInput, ValidationError } from '@/lib/api/validation'
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
    const { posts, profile } = parseLoomInput(await request.json())

    ensureDownloadsDir()

    // Generate page contents (same as preview uses)
    const pages = generatePageContents(posts, profile)
    const sessionId = crypto.randomUUID()
    const pdfPath = path.join(DOWNLOADS_DIR, `${sessionId}.pdf`)

    // Generate PDF using Puppeteer
    const pdfBuffer = await renderPagesToPdf(pages)
    fs.writeFileSync(pdfPath, pdfBuffer)

    const downloadUrl = `/downloads/${sessionId}.pdf`
    return NextResponse.json({ downloadUrl, sessionId })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('[PDF_GENERATION_ERROR]', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
