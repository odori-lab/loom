'use client'

import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n/context'
import { LanguageToggle } from '@/components/LanguageToggle'

interface SettingTabProps {
  user: User
}

export function SettingTab({ user }: SettingTabProps) {
  const router = useRouter()
  const supabase = createClient()
  const { t } = useI18n()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">{t('setting.title')}</h1>

        {/* Account section */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">{t('setting.account')}</h2>
          <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-100">
            {/* Profile */}
            <div className="flex items-center gap-4 p-4">
              {user.user_metadata.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt=""
                  className="w-12 h-12 rounded-full border border-gray-200"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-lg font-medium text-gray-600">
                    {user.email?.[0].toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user.user_metadata.full_name || 'User'}
                </p>
                <p className="text-sm text-gray-500 truncate">{user.email}</p>
              </div>
            </div>

            {/* Provider */}
            <div className="flex items-center justify-between p-4">
              <span className="text-sm text-gray-600">{t('setting.signInMethod')}</span>
              <span className="text-sm text-gray-900 capitalize">
                {user.app_metadata.provider || 'Email'}
              </span>
            </div>
          </div>
        </section>

        {/* Language */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">{t('setting.language')}</h2>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <LanguageToggle />
          </div>
        </section>

        {/* Sign out */}
        <section>
          <button
            onClick={handleSignOut}
            className="w-full px-4 py-3 text-sm font-medium text-red-600 bg-white border border-gray-100 rounded-xl hover:bg-red-50 transition-colors duration-150 active:scale-[0.98]"
          >
            {t('setting.signOut')}
          </button>
        </section>
      </div>
    </div>
  )
}
