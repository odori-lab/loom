'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ThreadsPost, ThreadsProfile } from '@/types/threads'
import { UsernameStep } from '@/components/create/UsernameStep'
import { SelectPostsStep } from '@/components/create/SelectPostsStep'
import { CompleteStep } from '@/components/create/CompleteStep'
import { MOCK_PROFILE, MOCK_POSTS } from '@/lib/mockdata'

type Step = 'username' | 'select' | 'complete'

// 개발 모드에서 mockdata 사용 여부
const USE_MOCK_DATA = true

export default function CreatePage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(USE_MOCK_DATA ? 'select' : 'username')
  const [posts, setPosts] = useState<ThreadsPost[]>(USE_MOCK_DATA ? MOCK_POSTS : [])
  const [profile, setProfile] = useState<ThreadsProfile | null>(USE_MOCK_DATA ? MOCK_PROFILE : null)
  const [downloadUrl, setDownloadUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleUsernameSubmit = async (username: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setPosts(data.posts)
      setProfile(data.profile)
      setStep('select')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateLoom = async (selectedPosts: ThreadsPost[]) => {
    if (!profile) return

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/looms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posts: selectedPosts, profile })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setDownloadUrl(data.downloadUrl)
      setStep('complete')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAnother = () => {
    setPosts([])
    setProfile(null)
    setDownloadUrl('')
    setStep('username')
  }

  const steps = ['username', 'select', 'complete'] as const
  const currentStepIndex = steps.indexOf(step)

  const ProgressIndicator = ({ compact = false }: { compact?: boolean }) => (
    <div className={`flex items-center ${compact ? 'gap-1.5' : 'gap-2'}`}>
      {steps.map((s, i) => (
        <div key={s} className="flex items-center">
          <div
            className={`flex items-center justify-center font-medium transition-all ${
              compact ? 'w-6 h-6 text-xs rounded-lg' : 'w-8 h-8 text-sm rounded-xl'
            } ${
              step === s
                ? 'bg-gray-900 text-white shadow-sm'
                : i < currentStepIndex
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            {i < currentStepIndex ? (
              <svg className={compact ? 'w-3 h-3' : 'w-4 h-4'} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              i + 1
            )}
          </div>
          {i < 2 && (
            <div className={`mx-1 ${compact ? 'w-6 h-0.5' : 'w-10 h-0.5'} ${
              i < currentStepIndex ? 'bg-green-500' : 'bg-gray-200'
            }`} />
          )}
        </div>
      ))}
    </div>
  )

  // select 단계에서는 전체 화면 레이아웃 사용
  if (step === 'select' && profile) {
    return (
      <div className="h-screen flex flex-col bg-white">
        <header className="border-b border-gray-100 flex-shrink-0 bg-white/80 backdrop-blur-md">
          <div className="px-6 h-14 flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Loom
            </Link>
            <div className="flex items-center gap-6">
              <ProgressIndicator compact />
              <Link
                href="/my"
                className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
              >
                My Looms
              </Link>
            </div>
          </div>
        </header>

        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        <main className="flex-1 overflow-hidden">
          <SelectPostsStep
            posts={posts}
            profile={profile}
            onGenerate={handleGenerateLoom}
            onBack={() => setStep('username')}
            loading={loading}
          />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Loom
          </Link>
          <Link
            href="/my"
            className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            My Looms
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Progress indicator */}
        <div className="flex items-center justify-center mb-16">
          <ProgressIndicator />
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {step === 'username' && (
          <UsernameStep
            onSubmit={handleUsernameSubmit}
            loading={loading}
          />
        )}

        {step === 'complete' && (
          <CompleteStep
            downloadUrl={downloadUrl}
            onCreateAnother={handleCreateAnother}
            onViewLooms={() => router.push('/my')}
          />
        )}
      </main>
    </div>
  )
}
