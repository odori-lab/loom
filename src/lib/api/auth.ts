import { createClient } from '@/lib/supabase/server'
import { SupabaseClient, User } from '@supabase/supabase-js'

export class AuthError extends Error {
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'AuthError'
  }
}

export async function requireAuth(): Promise<{ user: User; supabase: SupabaseClient }> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new AuthError()
  }

  return { user, supabase }
}
