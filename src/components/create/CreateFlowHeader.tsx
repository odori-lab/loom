'use client'

import Link from 'next/link'
import { ProgressIndicator } from './ProgressIndicator'

interface CreateFlowHeaderProps {
  variant?: 'default' | 'compact'
}

export function CreateFlowHeader({ variant = 'default' }: CreateFlowHeaderProps) {
  if (variant === 'compact') {
    return (
      <header className="border-b border-gray-100 flex-shrink-0 bg-white/80 backdrop-blur-md">
        <div className="px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Loom
          </Link>
          <div className="flex items-center gap-6">
            <ProgressIndicator compact />
            <Link
              href="/my"
              className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
            >
              My Looms
            </Link>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
          Loom
        </Link>
        <Link
          href="/my"
          className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          My Looms
        </Link>
      </div>
    </header>
  )
}
