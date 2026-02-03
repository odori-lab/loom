import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database'

type Loom = Database['public']['Tables']['looms']['Row']

// GET /api/looms/[id] - Get loom details with download URL
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
    const { data: urlData } = await supabase.storage
      .from('looms-pdf')
      .createSignedUrl(loom.pdf_path, 3600) // 1 hour expiry

    return NextResponse.json({
      loom,
      downloadUrl: urlData?.signedUrl
    })
  } catch (error) {
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
    const { id } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
    console.error('[LOOM_DELETE_ERROR]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
