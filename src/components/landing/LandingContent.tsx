'use client'

import Image from 'next/image'
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/icon-white.png" alt="Loom" width={32} height={32} />
            <span className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Loom
            </span>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Link
                  href="/my"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
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
      <section className="relative py-32 px-6 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-200 rounded-full blur-3xl opacity-30 animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-200 rounded-full blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-600 mb-8">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Threads to PDF in seconds
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-8 leading-tight tracking-tight">
            {t('hero.title1')}
            <br />
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              {t('hero.title2')}
            </span>
          </h1>
          <p className="text-xl text-gray-500 mb-12 max-w-2xl mx-auto leading-relaxed">
            {t('hero.description')}
          </p>
          <Link
            href={user ? "/my?tab=create" : "/login?redirect=/my?tab=create"}
            className="inline-flex items-center gap-3 px-8 py-4 bg-gray-900 text-white rounded-full font-medium text-lg hover:bg-gray-800 hover:scale-105 transition-all shadow-lg shadow-gray-900/20"
          >
            {t('hero.cta')}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 bg-gray-100 rounded-full text-sm font-medium text-gray-600 mb-4">
              Simple Process
            </span>
            <h2 className="text-4xl font-bold text-gray-900">
              {t('howItWorks.title')}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: 1, title: t('howItWorks.step1.title'), desc: t('howItWorks.step1.description'), color: 'purple' },
              { step: 2, title: t('howItWorks.step2.title'), desc: t('howItWorks.step2.description'), color: 'blue' },
              { step: 3, title: t('howItWorks.step3.title'), desc: t('howItWorks.step3.description'), color: 'green' },
            ].map((item) => (
              <div key={item.step} className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-50 rounded-3xl -z-10 group-hover:scale-105 transition-transform" />
                <div className="p-8">
                  <div className={`w-14 h-14 mb-6 rounded-2xl bg-gradient-to-br ${
                    item.color === 'purple' ? 'from-purple-500 to-purple-600' :
                    item.color === 'blue' ? 'from-blue-500 to-blue-600' :
                    'from-green-500 to-green-600'
                  } text-white flex items-center justify-center text-xl font-bold shadow-lg`}>
                    {item.step}
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-gray-900">{item.title}</h3>
                  <p className="text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 bg-white rounded-full text-sm font-medium text-gray-600 mb-4 shadow-sm">
              Features
            </span>
            <h2 className="text-4xl font-bold text-gray-900">
              {t('features.title')}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                ),
                title: t('features.bookFormat.title'),
                desc: t('features.bookFormat.description'),
                gradient: 'from-purple-500 to-pink-500',
                bg: 'bg-purple-50'
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                ),
                title: t('features.images.title'),
                desc: t('features.images.description'),
                gradient: 'from-blue-500 to-cyan-500',
                bg: 'bg-blue-50'
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                ),
                title: t('features.filter.title'),
                desc: t('features.filter.description'),
                gradient: 'from-green-500 to-emerald-500',
                bg: 'bg-green-50'
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                ),
                title: t('features.engagement.title'),
                desc: t('features.engagement.description'),
                gradient: 'from-orange-500 to-red-500',
                bg: 'bg-orange-50'
              }
            ].map((feature, i) => (
              <div key={i} className="group p-6 bg-white rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all">
                <div className={`w-12 h-12 mb-5 rounded-xl ${feature.bg} flex items-center justify-center`}>
                  <div className={`bg-gradient-to-r ${feature.gradient} bg-clip-text text-transparent`}>
                    {feature.icon}
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900">{feature.title}</h3>
                <p className="text-gray-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-12 md:p-16 text-center">
            <div className="absolute inset-0 -z-10">
              <div className="absolute top-0 left-1/4 w-64 h-64 bg-purple-500 rounded-full blur-3xl opacity-20" />
              <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-blue-500 rounded-full blur-3xl opacity-20" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              {t('cta.title')}
            </h2>
            <p className="text-lg text-gray-400 mb-10 max-w-xl mx-auto">
              {t('cta.description')}
            </p>
            <Link
              href={user ? "/my?tab=create" : "/login?redirect=/my?tab=create"}
              className="inline-flex items-center gap-3 px-8 py-4 bg-white text-gray-900 rounded-full font-medium text-lg hover:bg-gray-100 hover:scale-105 transition-all shadow-lg"
            >
              {t('cta.button')}
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-gray-100">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-sm text-gray-500">
            {t('footer.copyright')}
          </span>
          <div className="flex items-center gap-6">
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
