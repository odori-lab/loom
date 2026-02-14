'use client'

import Image from 'next/image'
import Link from 'next/link'
import { User } from '@supabase/supabase-js'
import { useDashboard } from './DashboardContext'
import { BookOpenIcon, PlusIcon } from '@/components/ui/Icons'
import { useI18n } from '@/lib/i18n/context'

interface SidebarProps {
  user: User
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

export function Sidebar({ user }: SidebarProps) {
  const { activeTab, setActiveTab } = useDashboard()
  const { t } = useI18n()

  const tabs = [
    { id: 'looms' as const, label: t('dashboard.looms'), icon: BookOpenIcon },
    { id: 'create' as const, label: t('dashboard.create'), icon: PlusIcon },
  ]

  const isSettingActive = activeTab === 'setting'

  return (
    <aside className="w-[300px] border-r border-gray-100 flex flex-col bg-white shrink-0">
      {/* Header */}
      <div className="h-16 px-6 flex items-center border-b border-gray-100">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/icon-white.png" alt="Loom" width={28} height={28} />
          <span className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Loom
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="p-4 flex flex-col gap-1 flex-1">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-150 text-left ${
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

      {/* Profile + Settings at bottom */}
      <div className="border-t border-gray-100">
        <button
          onClick={() => setActiveTab('setting')}
          className={`w-full flex items-center gap-3 px-6 py-4 transition-colors duration-150 active:scale-[0.98] ${
            isSettingActive ? 'bg-gray-50' : 'hover:bg-gray-50'
          }`}
        >
          {user.user_metadata.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt=""
              className={`w-9 h-9 rounded-full shrink-0 ${isSettingActive ? 'ring-2 ring-gray-900' : 'border border-gray-200'}`}
            />
          ) : (
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isSettingActive ? 'bg-gray-900 text-white' : 'bg-gray-200'}`}>
              <span className={`text-sm font-medium ${isSettingActive ? 'text-white' : 'text-gray-600'}`}>
                {user.email?.[0].toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user.user_metadata.full_name || user.email}
            </p>
            <p className="text-xs text-gray-500">{t('dashboard.settings')}</p>
          </div>
          <SettingsIcon className={`w-4 h-4 ${isSettingActive ? 'text-gray-900' : 'text-gray-400'}`} />
        </button>
      </div>
    </aside>
  )
}
