export default function CancelPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      <main className="w-full max-w-md text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Payment cancelled</h1>
          <p className="text-gray-500">No charges were made.</p>
        </div>
        <a
          href="/"
          className="inline-block px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
        >
          Try again
        </a>
      </main>
    </div>
  )
}
