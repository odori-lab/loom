'use client'

import { useMemo } from 'react'
import { CheckIcon, DownloadIcon, PlusIcon } from '@/components/ui/Icons'
import { useCreateFlow } from './CreateFlowContext'
import { useI18n } from '@/lib/i18n/context'

interface CompleteStepProps {
  onViewLooms?: () => void
}

function generateConfettiPieces(count: number) {
  const colors = ['#833AB4', '#FD1D1D', '#F77737', '#C13584', '#E1306C', '#833AB4', '#FD1D1D', '#F77737']
  const pieces: Array<{
    color: string; delay: number; duration: number; tx: number; ty: number; rotation: number; size: number; shape: 'circle' | 'square' | 'rect'
  }> = []
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 360 + ((i * 13) % 30)
    const radius = 80 + (i % 5) * 35
    const tx = Math.cos((angle * Math.PI) / 180) * radius
    const ty = Math.sin((angle * Math.PI) / 180) * radius * 0.6 - 40
    pieces.push({
      color: colors[i % colors.length], delay: (i * 15), duration: 900 + (i % 4) * 150,
      tx, ty, rotation: 360 + (i * 137) % 360, size: 4 + (i % 3) * 2,
      shape: (['circle', 'square', 'rect'] as const)[i % 3],
    })
  }
  return pieces
}

export function CompleteStep({ onViewLooms }: CompleteStepProps) {
  const { state: { downloadUrl }, actions: { createAnother } } = useCreateFlow()
  const { t } = useI18n()
  const confettiPieces = useMemo(() => generateConfettiPieces(24), [])

  return (
    <div className="relative max-w-md mx-auto text-center" style={{ animation: 'fadeInUp 0.5s ease-out both' }}>
      {/* Confetti burst */}
      <div className="absolute inset-0 pointer-events-none overflow-visible" style={{ top: '-80px', bottom: '-80px' }}>
        {confettiPieces.map((piece, i) => (
          <div
            key={i}
            className="absolute left-1/2 top-[25%]"
            style={{
              width: `${piece.size}px`,
              height: piece.shape === 'rect' ? `${piece.size * 2.5}px` : `${piece.size}px`,
              backgroundColor: piece.color,
              borderRadius: piece.shape === 'circle' ? '50%' : '1px',
              opacity: 0,
              animation: `cf-confetti-burst ${piece.duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94) ${piece.delay}ms forwards`,
              '--cf-tx': `${piece.tx}px`,
              '--cf-ty': `${piece.ty}px`,
              '--cf-rot': `${piece.rotation}deg`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      <div className="relative w-24 h-24 mx-auto mb-8">
        <div className="absolute inset-0 rounded-full bg-green-200 opacity-25" style={{ animation: 'cf-ring-expand 1.5s ease-out 0.3s both' }} />
        <div className="absolute inset-0 rounded-full bg-green-200 opacity-15" style={{ animation: 'cf-ring-expand 1.5s ease-out 0.6s both' }} />
        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center shadow-lg" style={{ animation: 'bounce-in 0.5s ease-out 0.2s both' }}>
          <CheckIcon className="w-12 h-12 text-white" />
        </div>
      </div>

      <h1 className="text-4xl font-bold text-gray-900 mb-3" style={{ animation: 'fadeInUp 0.5s ease-out 0.35s both' }}>{t('create.complete.title')}</h1>
      <p className="text-lg text-gray-500 mb-10" style={{ animation: 'fadeInUp 0.5s ease-out 0.42s both' }}>
        {t('create.complete.description')}
      </p>

      <div className="space-y-3">
        <a
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 w-full py-4 bg-gray-900 text-white rounded-2xl font-medium text-lg hover:bg-gray-800 hover:scale-[1.02] transition-all shadow-lg shadow-gray-900/20"
          style={{ animation: 'fadeInUp 0.4s ease-out 0.5s both' }}
        >
          <DownloadIcon />
          {t('create.complete.download')}
        </a>

        <button
          onClick={onViewLooms}
          className="flex items-center justify-center gap-3 w-full py-4 bg-gray-100 text-gray-700 rounded-2xl font-medium text-lg hover:bg-gray-200 transition-all"
          style={{ animation: 'fadeInUp 0.4s ease-out 0.58s both' }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          {t('create.complete.viewAll')}
        </button>

        <button
          onClick={createAnother}
          className="w-full py-3 text-gray-500 hover:text-gray-900 font-medium transition-colors flex items-center justify-center gap-2"
          style={{ animation: 'fadeInUp 0.4s ease-out 0.66s both' }}
        >
          <PlusIcon />
          {t('create.complete.another')}
        </button>
      </div>
    </div>
  )
}
