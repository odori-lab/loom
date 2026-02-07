'use client'

import { useCreateFlow } from '@/components/create/CreateFlowContext'
import { useDashboard } from './DashboardContext'
import { ProgressIndicator } from '@/components/create/ProgressIndicator'
import { ErrorBanner } from '@/components/create/ErrorBanner'
import { UsernameStep } from '@/components/create/UsernameStep'
import { PostListSidebar } from '@/components/create/PostListSidebar'
import { CompleteStep } from '@/components/create/CompleteStep'
import { BookPreview } from '@/components/create/BookPreview'

export function CreateTabContent() {
  const { state: { step, profile } } = useCreateFlow()
  const { setActiveTab } = useDashboard()

  if (step === 'select' && profile) {
    return (
      <PostListSidebar className="flex-1 flex flex-col bg-white overflow-hidden" />
    )
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center">
      <div className="w-full max-w-3xl mx-auto px-6">
        <div className="flex items-center justify-center mb-16">
          <ProgressIndicator />
        </div>

        <ErrorBanner className="mb-8" />

        {step === 'username' && <UsernameStep />}
        {step === 'complete' && <CompleteStep onViewLooms={() => setActiveTab('looms')} />}
      </div>
    </div>
  )
}

export function CreateTabRightPanel() {
  const { state: { step, profile } } = useCreateFlow()

  if (step === 'select' && profile) {
    return <BookPreview />
  }

  return null
}
