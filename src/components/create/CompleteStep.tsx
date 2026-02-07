'use client'

import { useRouter } from 'next/navigation'
import { CheckIcon, DownloadIcon, PlusIcon } from '@/components/ui/Icons'
import { useCreateFlow } from './CreateFlowContext'

export function CompleteStep() {
  const router = useRouter()
  const { state: { downloadUrl }, actions: { createAnother } } = useCreateFlow()

  return (
    <div className="max-w-md mx-auto text-center">
      <div className="relative w-24 h-24 mx-auto mb-8">
        <div className="absolute inset-0 bg-green-200 rounded-full animate-ping opacity-25" />
        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center shadow-lg">
          <CheckIcon className="w-12 h-12 text-white" />
        </div>
      </div>

      <h1 className="text-4xl font-bold text-gray-900 mb-3">Your Loom is ready!</h1>
      <p className="text-lg text-gray-500 mb-10">
        Your PDF has been generated and saved to your library
      </p>

      <div className="space-y-3">
        <a
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 w-full py-4 bg-gray-900 text-white rounded-2xl font-medium text-lg hover:bg-gray-800 hover:scale-[1.02] transition-all shadow-lg shadow-gray-900/20"
        >
          <DownloadIcon />
          Download PDF
        </a>

        <button
          onClick={() => router.push('/my')}
          className="flex items-center justify-center gap-3 w-full py-4 bg-gray-100 text-gray-700 rounded-2xl font-medium text-lg hover:bg-gray-200 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          View My Looms
        </button>

        <button
          onClick={createAnother}
          className="w-full py-3 text-gray-500 hover:text-gray-900 font-medium transition-colors flex items-center justify-center gap-2"
        >
          <PlusIcon />
          Create Another
        </button>
      </div>
    </div>
  )
}
