'use client'

import Link from 'next/link'
import { useI18n } from '@/lib/i18n/context'

export function LoginButton() {
  const { t } = useI18n()

  return (
    <Link
      href="/login"
      className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
    >
      {t('nav.signIn')}
    </Link>
  )
}
