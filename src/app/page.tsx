'use client'

import { useState } from 'react'
import { UsernameForm } from '@/components/UsernameForm'
import { ThreadsPost } from '@/types/threads-post'
import { PostSelector } from '@/components/PostSelector'

type Step = 'USERNAME' | 'SELECT_POSTS' | 'DOWNLOAD'

export default function Home() {
  const [step, setStep] = useState<Step>('USERNAME')
  const [username, setUsername] = useState('')
  const [posts, setPosts] = useState<ThreadsPost[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [downloadUrl, setDownloadUrl] = useState('')

  async function handleUsernameSubmit(submittedUsername: string) {
    setUsername(submittedUsername)
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: submittedUsername }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to scrape posts')
      }
      setPosts(data.posts)
      setStep('SELECT_POSTS')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleGeneratePdf(selectedPosts: ThreadsPost[]) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, posts: selectedPosts }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate PDF')
      }
      setDownloadUrl(data.downloadUrl)
      setStep('DOWNLOAD')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black px-4 text-white">
      <main className="w-full max-w-md space-y-10 text-center">
        <div className="space-y-3">
          <h1 className="text-5xl font-bold tracking-tight">Unthread</h1>
          <p className="text-lg text-gray-400">
            Turn any Threads profile into a beautiful PDF
          </p>
        </div>

        {step === 'USERNAME' && (
          <UsernameForm
            onSubmit={handleUsernameSubmit}
            loading={loading}
            error={error}
          />
        )}

        {step === 'SELECT_POSTS' && (
          <PostSelector
            posts={posts}
            username={username}
            onGeneratePdf={handleGeneratePdf}
            loading={loading}
          />
        )}

        {step === 'DOWNLOAD' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Your PDF is ready!</h2>
            <a
              href={downloadUrl}
              download
              className="inline-block w-full py-3 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Download PDF
            </a>
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
        )}

        <div className="space-y-4 pt-4 border-t border-gray-800">
          <div className="flex justify-center gap-8 text-sm text-gray-500">
            <div className={`flex flex-col items-center gap-1 ${step === 'USERNAME' ? 'text-white' : ''}`}>
              <span className="text-2xl">1</span>
              <span>Enter username</span>
            </div>
            <div className={`flex flex-col items-center gap-1 ${step === 'SELECT_POSTS' ? 'text-white' : ''}`}>
              <span className="text-2xl">2</span>
              <span>Select posts</span>
            </div>
            <div className={`flex flex-col items-center gap-1 ${step === 'DOWNLOAD' ? 'text-white' : ''}`}>
              <span className="text-2xl">3</span>
              <span>Download</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-600">
          This is a demo. No payment is required.
        </p>
      </main>
    </div>
  )
}
