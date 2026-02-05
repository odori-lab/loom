import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MyPageContent } from './MyPageContent'
import { UserMenu } from '@/components/auth/UserMenu'

export default async function MyPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: looms } = await supabase
    .from('looms')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="h-screen flex flex-col bg-white">
      <header className="border-b border-gray-100 shrink-0 bg-white/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Loom
          </Link>
          <UserMenu user={user} />
        </div>
      </header>

      <MyPageContent initialLooms={looms || []} />
    </div>
  )
}
