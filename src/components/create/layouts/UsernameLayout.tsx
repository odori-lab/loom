'use client'

import { useCreateFlow } from '../CreateFlowContext'
import { CreateFlowHeader } from '../CreateFlowHeader'
import { ErrorBanner } from '../ErrorBanner'
import { ProgressIndicator } from '../ProgressIndicator'
import { UsernameStep } from '../UsernameStep'

export function UsernameLayout() {
  const { state: { step } } = useCreateFlow()

  if (step !== 'username') return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <CreateFlowHeader />

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-center justify-center mb-16">
          <ProgressIndicator />
        </div>

        <ErrorBanner className="mb-8" />

        <UsernameStep />
      </main>
    </div>
  )
}
