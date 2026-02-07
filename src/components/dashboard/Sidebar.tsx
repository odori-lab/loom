'use client'

import Image from 'next/image'
import Link from 'next/link'
import { User } from '@supabase/supabase-js'
import { useDashboard } from './DashboardContext'
import { UserMenu } from '@/components/auth/UserMenu'
import { BookOpenIcon, PlusIcon } from '@/components/ui/Icons'

interface SidebarProps {
  user: User
}

export function Sidebar({ user }: SidebarProps) {
  const { activeTab, setActiveTab } = useDashboard()

  const tabs = [
    { id: 'looms' as const, label: 'Looms', icon: BookOpenIcon },
    { id: 'create' as const, label: 'Create', icon: PlusIcon },
  ]

  return (
    <aside className="w-[300px] border-r border-gray-100 flex flex-col bg-white shrink-0">
      {/* Header */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-gray-100">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/icon-white.png" alt="Loom" width={28} height={28} />
          <span className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Loom
          </span>
        </Link>
        <UserMenu user={user} />
      </div>

      {/* Navigation */}
      <nav className="p-4 flex flex-col gap-1">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors text-left ${
                isActive
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
