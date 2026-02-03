'use client'

import Link from 'next/link'
import { User } from '@supabase/supabase-js'
import { useI18n } from '@/lib/i18n/context'
import { UserMenu } from '@/components/auth/UserMenu'
import { LoginButton } from '@/components/auth/LoginButton'
import { LanguageToggle } from '@/components/LanguageToggle'

interface LandingContentProps {
  user: User | null
}

export function LandingContent({ user }: LandingContentProps) {
  const { t } = useI18n()

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-xl font-bold">Loom</span>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Link
                  href="/my"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  {t('nav.myLooms')}
                </Link>
                <UserMenu user={user} />
              </>
            ) : (
              <LoginButton />
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            {t('hero.title1')}
            <br />
            {t('hero.title2')}
          </h1>
          <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
            {t('hero.description')}
          </p>
          <Link
            href={user ? "/create" : "/login?redirect=/create"}
            className="inline-flex px-8 py-4 bg-black text-white rounded-full font-medium text-lg hover:bg-gray-800 transition-colors"
          >
            {t('hero.cta')}
          </Link>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-16">
            {t('howItWorks.title')}
          </h2>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-black text-white flex items-center justify-center text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold mb-3">{t('howItWorks.step1.title')}</h3>
              <p className="text-gray-500">
                {t('howItWorks.step1.description')}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-black text-white flex items-center justify-center text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold mb-3">{t('howItWorks.step2.title')}</h3>
              <p className="text-gray-500">
                {t('howItWorks.step2.description')}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-black text-white flex items-center justify-center text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold mb-3">{t('howItWorks.step3.title')}</h3>
              <p className="text-gray-500">
                {t('howItWorks.step3.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-16">
            {t('features.title')}
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-6 border border-gray-200 rounded-2xl">
              <div className="w-12 h-12 mb-4 rounded-xl bg-purple-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">{t('features.bookFormat.title')}</h3>
              <p className="text-gray-500">
                {t('features.bookFormat.description')}
              </p>
            </div>

            <div className="p-6 border border-gray-200 rounded-2xl">
              <div className="w-12 h-12 mb-4 rounded-xl bg-blue-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">{t('features.images.title')}</h3>
              <p className="text-gray-500">
                {t('features.images.description')}
              </p>
            </div>

            <div className="p-6 border border-gray-200 rounded-2xl">
              <div className="w-12 h-12 mb-4 rounded-xl bg-green-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">{t('features.filter.title')}</h3>
              <p className="text-gray-500">
                {t('features.filter.description')}
              </p>
            </div>

            <div className="p-6 border border-gray-200 rounded-2xl">
              <div className="w-12 h-12 mb-4 rounded-xl bg-orange-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">{t('features.engagement.title')}</h3>
              <p className="text-gray-500">
                {t('features.engagement.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-black text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            {t('cta.title')}
          </h2>
          <p className="text-lg text-gray-400 mb-10">
            {t('cta.description')}
          </p>
          <Link
            href={user ? "/create" : "/login?redirect=/create"}
            className="inline-flex px-8 py-4 bg-white text-black rounded-full font-medium text-lg hover:bg-gray-200 transition-colors"
          >
            {t('cta.button')}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {t('footer.copyright')}
          </span>
          <div className="flex items-center gap-4">
            <LanguageToggle />
            <span className="text-sm text-gray-500">
              {t('footer.madeWith')}
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
