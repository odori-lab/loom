'use client'

import { createContext, use, useState, useEffect, ReactNode } from 'react'
import { Locale, translations, TranslationKey } from './translations'

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: TranslationKey) => string
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

export function I18nProvider({ children, initialLocale = 'ko' }: { children: ReactNode, initialLocale?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)

  useEffect(() => {
    const saved = document.cookie
      .split('; ')
      .find(row => row.startsWith('locale='))
      ?.split('=')[1] as Locale | undefined
    if (saved && (saved === 'ko' || saved === 'en')) {
      setLocaleState(saved)
    }
  }, [])

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    document.cookie = `locale=${newLocale}; path=/; max-age=31536000`
  }

  const t = (key: TranslationKey): string => {
    return translations[locale][key] || translations.en[key] || key
  }

  return (
    <I18nContext value={{ locale, setLocale, t }}>
      {children}
    </I18nContext>
  )
}

export function useI18n() {
  const context = use(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}
