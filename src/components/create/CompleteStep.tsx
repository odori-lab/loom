'use client'

interface CompleteStepProps {
  downloadUrl: string
  onCreateAnother: () => void
  onViewLooms: () => void
}

export function CompleteStep({
  downloadUrl,
  onCreateAnother,
  onViewLooms
}: CompleteStepProps) {
  return (
    <div className="max-w-md mx-auto text-center">
      <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Loom is ready!</h1>
      <p className="text-gray-500 mb-8">
        Your PDF has been generated and saved to your library
      </p>

      <div className="space-y-3">
        <a
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
        >
          Download PDF
        </a>

        <button
          onClick={onViewLooms}
          className="w-full py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          View My Looms
        </button>

        <button
          onClick={onCreateAnother}
          className="w-full py-3 text-gray-600 hover:text-gray-900 transition-colors"
        >
          Create Another
        </button>
      </div>
    </div>
  )
}
