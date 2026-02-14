'use client'

import { useCreateFlow } from './CreateFlowContext'

export function ProgressIndicator({ compact = false }: { compact?: boolean }) {
  const { state: { step }, meta: { steps, currentStepIndex } } = useCreateFlow()

  return (
    <div className={`flex items-center ${compact ? 'gap-1.5' : 'gap-2'}`}>
      {steps.map((s, i) => (
        <div key={s} className="flex items-center">
          <div
            className={`flex items-center justify-center font-medium transition-all duration-200 ${
              compact ? 'w-6 h-6 text-xs rounded-lg' : 'w-8 h-8 text-sm rounded-xl'
            } ${
              step === s
                ? 'bg-gray-900 text-white shadow-sm scale-110'
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
            <div className={`mx-1 ${compact ? 'w-6 h-0.5' : 'w-10 h-0.5'} transition-colors duration-300 ${
              i < currentStepIndex ? 'bg-green-500' : 'bg-gray-200'
            }`} />
          )}
        </div>
      ))}
    </div>
  )
}
