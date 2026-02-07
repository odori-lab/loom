'use client'

import { useCreateFlow } from '../CreateFlowContext'
import { CreateFlowHeader } from '../CreateFlowHeader'
import { ErrorBanner } from '../ErrorBanner'
import { BookPreview } from '../BookPreview'
import { PostListSidebar } from '../PostListSidebar'

export function SelectLayout() {
  const { state: { step, profile } } = useCreateFlow()

  if (step !== 'select' || !profile) return null

  return (
    <div className="h-screen flex flex-col bg-white">
      <CreateFlowHeader variant="compact" />

      <ErrorBanner className="mx-6 mt-4" />

      <main className="flex-1 overflow-hidden">
        <div className="flex h-full">
          <BookPreview />
          <PostListSidebar />
        </div>
      </main>
    </div>
  )
}
