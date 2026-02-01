import { UsernameForm } from '@/components/UsernameForm'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      <main className="w-full max-w-md space-y-10 text-center">
        <div className="space-y-3">
          <h1 className="text-5xl font-bold tracking-tight">Unthread</h1>
          <p className="text-lg text-gray-500">
            Turn any Threads profile into a beautiful PDF
          </p>
        </div>

        <UsernameForm />

        <div className="space-y-4 pt-4 border-t border-gray-100">
          <div className="flex justify-center gap-8 text-sm text-gray-400">
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl">1</span>
              <span>Enter username</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl">2</span>
              <span>Pay once</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl">3</span>
              <span>Download PDF</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-400">
          Secure payment via Stripe. Instant refund if anything goes wrong.
        </p>
      </main>
    </div>
  )
}
