import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import puppeteer from 'puppeteer'
import { ThreadsPost, ThreadsProfile } from '@/types/threads'
import { generatePdfHtml } from '@/lib/pdf/generator'
import { CoverData } from '@/types/loom'

// GET /api/looms - List user's looms
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
    console.error('[LOOMS_LIST_ERROR]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/looms - Create a new loom
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    // Generate PDF
    const htmlContent = generatePdfHtml(posts, profile)
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    const page = await browser.newPage()
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' })

    const pdfBuffer = await page.pdf({
      width: '148mm',
      height: '210mm',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })

    await browser.close()

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
    const { data: urlData } = await supabase.storage
      .from('looms-pdf')
      .createSignedUrl(pdfPath, 3600) // 1 hour expiry

    return NextResponse.json({
      loom,
      downloadUrl: urlData?.signedUrl
    })
  } catch (error) {
    console.error('[LOOM_CREATE_ERROR]', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Internal server error: ${message}` }, { status: 500 })
  }
}
