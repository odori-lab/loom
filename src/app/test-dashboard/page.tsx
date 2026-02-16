'use client'

import { Suspense } from 'react'
import { I18nProvider } from '@/lib/i18n/context'
import { DashboardProvider } from '@/components/dashboard/DashboardContext'
import { LoomsTab } from '@/components/dashboard/LoomsTab'
import { LoomPreviewPanel } from '@/components/dashboard/LoomPreviewPanel'
import dynamic from 'next/dynamic'

const PreviewModal = dynamic(
  () => import('@/components/dashboard/PreviewModal').then((mod) => mod.PreviewModal),
  { ssr: false }
)

// Mock loom data for testing
const MOCK_LOOMS = [
  {
    id: 'test-loom-1',
    user_id: 'test-user',
    thread_username: 'whatthesol',
    thread_display_name: 'Sol You',
    title: 'Life in Germany',
    post_count: 42,
    pdf_path: 'test/test.pdf',
    cover_data: {
      name: 'Sol You',
      username: 'whatthesol',
      bio: 'Germany, Düsseldorf',
      profileImageUrl: null,
      followerCount: 100,
    },
    book_structure: {
      title: 'Life in Germany',
      preface: 'A collection of stories',
      chapters: [
        {
          id: 'ch-1',
          title: 'Daily Life',
          description: 'Everyday moments in Germany',
          subChapters: [
            { id: 'sc-1-1', title: 'Morning Routines', postIds: ['p1', 'p2'] },
            { id: 'sc-1-2', title: 'Work from Home', postIds: ['p3'] },
          ],
        },
        {
          id: 'ch-2',
          title: 'Relationships',
          description: 'Stories about love and family',
          subChapters: [
            { id: 'sc-2-1', title: 'Marriage Life', postIds: ['p4', 'p5', 'p6'] },
          ],
        },
        {
          id: 'ch-3',
          title: 'Reflections',
          description: 'Thoughts and observations',
          subChapters: [
            { id: 'sc-3-1', title: 'Social Life', postIds: ['p7'] },
            { id: 'sc-3-2', title: 'Memories', postIds: ['p8', 'p9'] },
          ],
        },
      ],
    },
    created_at: '2026-02-10T12:00:00Z',
  },
  {
    id: 'test-loom-2',
    user_id: 'test-user',
    thread_username: 'testuser2',
    thread_display_name: 'Test User 2',
    title: null,
    post_count: 15,
    pdf_path: 'test/test2.pdf',
    cover_data: {
      name: 'Test User 2',
      username: 'testuser2',
      bio: 'Testing',
      profileImageUrl: null,
      followerCount: 50,
    },
    book_structure: null,
    created_at: '2026-02-08T10:00:00Z',
  },
] as any[]

function TestDashboard() {
  return (
    <div className="h-screen flex" id="test-dashboard">
      {/* Looms list */}
      <div className="flex-1 flex overflow-hidden" id="looms-container">
        <LoomsTab />
        <LoomPreviewPanel width={500} />
      </div>
      <PreviewModal />

      {/* Debug info */}
      <div id="debug-bar" className="fixed bottom-0 left-0 right-0 h-8 bg-gray-900 text-white text-xs flex items-center px-4 gap-4 z-[100]">
        <span id="loom-count">Looms: {MOCK_LOOMS.length}</span>
      </div>
    </div>
  )
}

export default function TestDashboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <I18nProvider>
        <DashboardProvider initialLooms={MOCK_LOOMS}>
          <TestDashboard />
        </DashboardProvider>
      </I18nProvider>
    </Suspense>
  )
}
