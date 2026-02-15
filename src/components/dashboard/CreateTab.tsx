'use client'

import { useCreateFlow } from '@/components/create/CreateFlowContext'
import { useDashboard } from './DashboardContext'
import { ProgressIndicator } from '@/components/create/ProgressIndicator'
import { ErrorBanner } from '@/components/create/ErrorBanner'
import { UsernameStep } from '@/components/create/UsernameStep'
import { TOCSidebar } from '@/components/create/TOCSidebar'
import { CompleteStep } from '@/components/create/CompleteStep'
import { BookPreview } from '@/components/create/BookPreview'

export function CreateTabContent() {
  const { state: { step, profile } } = useCreateFlow()
  const { setActiveTab } = useDashboard()

  if (step === 'organize' && profile) {
    return (
      <TOCSidebar className="flex-1 flex flex-col bg-white overflow-hidden" />
    )
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center" style={{ animation: 'fadeIn 0.3s ease-out both' }}>
      <div className="w-full max-w-3xl mx-auto px-6" key={step}>
        <div className="flex items-center justify-center mb-16" style={{ animation: 'fadeInUp 0.5s ease-out both' }}>
          <ProgressIndicator />
        </div>

        <ErrorBanner className="mb-8" />

        {step === 'username' && <UsernameStep />}
        {step === 'complete' && <CompleteStep onViewLooms={() => setActiveTab('looms')} />}
      </div>
    </div>
  )
}

export function CreateTabRightPanel({ width }: { width?: number }) {
  const { state: { step, profile } } = useCreateFlow()

  if (step === 'organize' && profile) {
    return (
      <div style={{ width: width ?? 600 }} className="shrink-0 flex flex-col h-full">
        <BookPreview width={width} />
      </div>
    )
  }

  return null
}
