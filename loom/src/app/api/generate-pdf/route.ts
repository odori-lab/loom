import { NextResponse } from 'next/server'
import { createLoomPdf } from '@/lib/pdf/render'
import { parseLoomInput, ValidationError } from '@/lib/api/validation'

export async function POST(request: Request) {
  try {
    const { posts, profile } = parseLoomInput(await request.json())

    // Generate PDF via worker
    const { pdfPath, loomId } = await createLoomPdf(posts, profile, 'anonymous')

    return NextResponse.json({ pdfPath, loomId })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('[PDF_GENERATION_ERROR]', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
