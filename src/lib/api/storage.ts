import { SupabaseClient } from '@supabase/supabase-js'

const SIGNED_URL_EXPIRY = 3600 // 1 hour

export async function getSignedDownloadUrl(
  supabase: SupabaseClient,
  pdfPath: string
): Promise<string | null> {
  const { data } = await supabase.storage
    .from('looms-pdf')
    .createSignedUrl(pdfPath, SIGNED_URL_EXPIRY)

  return data?.signedUrl ?? null
}
