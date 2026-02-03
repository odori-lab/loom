'use client'

import { useI18n } from '@/lib/i18n/context'

export function LanguageToggle() {
  const { locale, setLocale } = useI18n()

  const toggleLocale = () => {
    setLocale(locale === 'ko' ? 'en' : 'ko')
  }

  return (
    <button
      onClick={toggleLocale}
      className="text-sm text-gray-500 hover:text-gray-700 transition-colors font-medium"
    >
      {locale === 'ko' ? 'EN' : '한국어'}
    </button>
  )
}
