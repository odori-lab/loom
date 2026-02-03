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
      <header className="border-b shrink-0">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">Loom</Link>
          <UserMenu user={user} />
        </div>
      </header>

      <MyPageContent initialLooms={looms || []} />
    </div>
  )
}
