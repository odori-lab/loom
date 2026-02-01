'use client'

export function DownloadButton({ sessionId, postCount }: { sessionId: string; postCount: number }) {
  return (
    <a
      href={`/api/download/${sessionId}`}
      className="inline-block px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
    >
      Download PDF ({postCount} posts)
    </a>
  )
}
