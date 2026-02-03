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

  // select 단계에서는 전체 화면 레이아웃 사용
  if (step === 'select' && profile) {
    return (
      <div className="h-screen flex flex-col bg-white">
        <header className="border-b flex-shrink-0">
          <div className="px-4 h-14 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold">Loom</Link>
            <div className="flex items-center gap-4">
              {/* Progress indicator */}
              <div className="flex items-center gap-2">
                {['username', 'select', 'complete'].map((s, i) => (
                  <div key={s} className="flex items-center">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        step === s
                          ? 'bg-black text-white'
                          : i < ['username', 'select', 'complete'].indexOf(step)
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {i < ['username', 'select', 'complete'].indexOf(step) ? (
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </div>
                    {i < 2 && (
                      <div className={`w-8 h-0.5 mx-1 ${
                        i < ['username', 'select', 'complete'].indexOf(step)
                          ? 'bg-green-500'
                          : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
              <Link
                href="/my"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                My Looms
              </Link>
            </div>
          </div>
        </header>

        {error && (
          <div className="mx-4 mt-4 p-4 bg-red-50 text-red-700 rounded-lg text-sm">
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
    <div className="min-h-screen bg-white">
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">Loom</Link>
          <Link
            href="/my"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            My Looms
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-12">
          {['username', 'select', 'complete'].map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === s
                    ? 'bg-black text-white'
                    : i < ['username', 'select', 'complete'].indexOf(step)
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {i < ['username', 'select', 'complete'].indexOf(step) ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              {i < 2 && (
                <div className={`w-16 h-0.5 mx-1 ${
                  i < ['username', 'select', 'complete'].indexOf(step)
                    ? 'bg-green-500'
                    : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm">
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
