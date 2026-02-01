import { NextRequest, NextResponse } from 'next/server'
import { getJob } from '@/lib/job-store'
import fs from 'fs'
import path from 'path'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params

  const job = getJob(sessionId)
  if (!job) {
    return NextResponse.json({ error: { code: 'SESSION_NOT_FOUND', message: 'Session not found' } }, { status: 404 })
  }

  if (job.status !== 'completed' || !job.pdfUrl) {
    return NextResponse.json({ error: { code: 'PDF_NOT_READY', message: 'PDF is not ready yet' } }, { status: 404 })
  }

  const filepath = path.join(process.cwd(), 'public', job.pdfUrl)
  if (!fs.existsSync(filepath)) {
    return NextResponse.json({ error: { code: 'PDF_GENERATION_FAILED', message: 'PDF file not found' } }, { status: 404 })
  }

  const buffer = fs.readFileSync(filepath)
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${job.threadsUsername}-threads.pdf"`,
    },
  })
}
