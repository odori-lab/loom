'use client'

import { useMemo, ReactNode } from 'react'
import { useDashboard } from './DashboardContext'
import { useI18n } from '@/lib/i18n/context'
import dynamic from 'next/dynamic'

const PdfPageViewer = dynamic(
  () => import('@/components/ui/PdfPageViewer').then((mod) => mod.PdfPageViewer),
  { ssr: false }
)

const BASE_PDF_WIDTH = 568

export interface LoomPreviewPanelProps {
  width?: number
  /** Override the preview URL (bypasses DashboardContext) */
  previewUrl?: string
  /** Override loading state */
  loading?: boolean
  /** Override page click handler */
  onPageClick?: () => void
  /** Custom empty state (shown when no content is active) */
  emptyState?: ReactNode
  /** Whether there is active content to display. Defaults to checking selectedLoom from context. */
  active?: boolean
  /** Optional bottom bar content */
  bottomBar?: ReactNode
  /** Custom content to render instead of the PDF viewer */
  children?: ReactNode
}

export function LoomPreviewPanel({
  width,
  previewUrl: propPreviewUrl,
  loading: propLoading,
  onPageClick: propOnPageClick,
  emptyState,
  active: propActive,
  bottomBar,
  children,
}: LoomPreviewPanelProps) {
  const dashboard = useDashboard()
  const { t } = useI18n()

  const isActive = propActive ?? !!dashboard.selectedLoom
  const previewUrl = propPreviewUrl ?? dashboard.previewUrl
  const loadingPreview = propLoading ?? dashboard.loadingPreview
  const handlePageClick = propOnPageClick ?? (() => dashboard.openPreviewModal())

  const panelWidth = width ?? 600
  const availableWidth = panelWidth - 96 // more padding for breathing room
  const scale = useMemo(() => Math.min(0.85, availableWidth / BASE_PDF_WIDTH), [availableWidth])

  // Shell-only mode: when children are provided, render the panel shell with custom content
  if (children) {
    return (
      <div className="bg-gray-50 border-l border-gray-100 flex flex-col shrink-0" style={{ width: panelWidth }}>
        {children}
      </div>
    )
  }

  if (!isActive) {
    return (
      <div className="bg-gray-50 border-l border-gray-100 flex items-center justify-center shrink-0" style={{ width: panelWidth }}>
        {emptyState ?? (
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gray-200/50 flex items-center justify-center">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">{t('dashboard.preview.select')}</p>
            <p className="text-sm text-gray-400 mt-1">{t('dashboard.preview.hint')}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-gray-50 border-l border-gray-100 flex flex-col shrink-0" style={{ width: panelWidth }}>
      <div className="flex-1 overflow-y-auto">
        {loadingPreview ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full border-4 border-gray-200 border-t-gray-900 animate-spin" />
              <p className="text-sm text-gray-500">{t('dashboard.preview.loading')}</p>
            </div>
          </div>
        ) : previewUrl ? (
          <div className="min-h-full flex flex-col items-center justify-center p-10">
            <div style={{ width: BASE_PDF_WIDTH * scale }}>
              <div style={{
                width: BASE_PDF_WIDTH,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
              }}>
                <PdfPageViewer url={previewUrl} width={BASE_PDF_WIDTH} onPageClick={() => handlePageClick()} />
              </div>
            </div>
          </div>
        ) : emptyState ? (
          <div className="h-full flex items-center justify-center">
            {emptyState}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-gray-500">{t('dashboard.preview.error')}</p>
            </div>
          </div>
        )}
      </div>
      {bottomBar}
    </div>
  )
}
