import { NextResponse } from 'next/server'
import { Database } from '@/types/database'
import { requireAuth, AuthError } from '@/lib/api/auth'
import { getSignedDownloadUrl } from '@/lib/api/storage'

type Loom = Database['public']['Tables']['looms']['Row']

// GET /api/looms/[id] - Get loom details with download URL
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const [{ id }, { user, supabase }] = await Promise.all([params, requireAuth()])

    const { data, error } = await supabase
      .from('looms')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Loom not found' }, { status: 404 })
    }

    const loom = data as Loom

    // Generate signed download URL
    const downloadUrl = await getSignedDownloadUrl(supabase, loom.pdf_path)

    return NextResponse.json({
      loom,
      downloadUrl
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[LOOM_GET_ERROR]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/looms/[id] - Delete a loom
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const [{ id }, { user, supabase }] = await Promise.all([params, requireAuth()])

    // Get loom to find PDF path
    const { data, error: fetchError } = await supabase
      .from('looms')
      .select('pdf_path')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !data) {
      return NextResponse.json({ error: 'Loom not found' }, { status: 404 })
    }

    const loom = data as Pick<Loom, 'pdf_path'>

    // Delete from storage
    await supabase.storage
      .from('looms-pdf')
      .remove([loom.pdf_path])

    // Delete from database
    const { error: deleteError } = await supabase
      .from('looms')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('[LOOM_DELETE_ERROR]', deleteError)
      return NextResponse.json({ error: 'Failed to delete loom' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[LOOM_DELETE_ERROR]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
