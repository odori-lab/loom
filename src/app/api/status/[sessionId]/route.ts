import { NextRequest, NextResponse } from 'next/server'
import { getJob } from '@/lib/job-store'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params

  const job = getJob(sessionId)
  if (!job) {
    return NextResponse.json({ error: { code: 'SESSION_NOT_FOUND', message: 'Session not found' } }, { status: 404 })
  }

  return NextResponse.json({
    status: job.status,
    postCount: job.postCount,
    pdfUrl: job.pdfUrl,
    errorMessage: job.errorMessage,
  })
}
