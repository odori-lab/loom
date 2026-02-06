import { NextResponse } from 'next/server'
import { generatePageContents } from '@/lib/pdf/generator'
import { renderPagesToPdf } from '@/lib/pdf/render'
import { requireAuth, AuthError } from '@/lib/api/auth'
import { parseLoomInput, ValidationError } from '@/lib/api/validation'
import { getSignedDownloadUrl } from '@/lib/api/storage'
import { CoverData } from '@/types/loom'

// GET /api/looms - List user's looms
export async function GET() {
  try {
    const { user, supabase } = await requireAuth()

    const { data: looms, error } = await supabase
      .from('looms')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[LOOMS_LIST_ERROR]', error)
      return NextResponse.json({ error: 'Failed to fetch looms' }, { status: 500 })
    }

    return NextResponse.json({ looms })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[LOOMS_LIST_ERROR]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/looms - Create a new loom
export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireAuth()
    const { posts, profile } = parseLoomInput(await request.json())

    // Generate page contents (same as preview uses)
    const pages = generatePageContents(posts, profile)

    // Generate PDF using Puppeteer
    const pdfBuffer = await renderPagesToPdf(pages)

    // Upload to Supabase Storage
    const loomId = crypto.randomUUID()
    const pdfPath = `${user.id}/${loomId}.pdf`

    const { error: uploadError } = await supabase.storage
      .from('looms-pdf')
      .upload(pdfPath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false
      })

    if (uploadError) {
      console.error('[STORAGE_UPLOAD_ERROR]', JSON.stringify(uploadError, null, 2))
      return NextResponse.json({ error: `Failed to upload PDF: ${uploadError.message}` }, { status: 500 })
    }

    // Create loom record
    const coverData: CoverData = {
      name: profile.displayName,
      username: profile.username,
      bio: profile.bio,
      profileImageUrl: profile.profileImageUrl,
      followerCount: profile.followerCount
    }

    const loomData = {
      id: loomId,
      user_id: user.id,
      thread_username: profile.username,
      thread_display_name: profile.displayName,
      post_count: posts.length,
      pdf_path: pdfPath,
      cover_data: coverData as any
    }

    const { data: loom, error: insertError } = await supabase
      .from('looms')
      .insert(loomData as any)
      .select()
      .single()

    if (insertError) {
      console.error('[LOOM_INSERT_ERROR]', JSON.stringify(insertError, null, 2))
      // Try to clean up uploaded file
      await supabase.storage.from('looms-pdf').remove([pdfPath])
      return NextResponse.json({ error: `Failed to create loom: ${insertError.message}` }, { status: 500 })
    }

    // Get download URL
    const downloadUrl = await getSignedDownloadUrl(supabase, pdfPath)

    return NextResponse.json({
      loom,
      downloadUrl
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('[LOOM_CREATE_ERROR]', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Internal server error: ${message}` }, { status: 500 })
  }
}
