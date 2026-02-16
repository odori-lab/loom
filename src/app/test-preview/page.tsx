'use client'

import { Suspense } from 'react'
import { CreateFlowProvider } from '@/components/create/CreateFlowProvider'
import { BookPreview } from '@/components/create/BookPreview'
import { useCreateFlow } from '@/components/create/CreateFlowContext'
import { I18nProvider } from '@/lib/i18n/context'

function PreviewPanel() {
  const {
    state: { measuring },
    meta: { pages, spreads, selectedCount, totalSpreads },
  } = useCreateFlow()

  return (
    <div className="h-screen flex flex-col">
      {/* Debug info bar */}
      <div
        id="debug-info"
        className="h-10 px-4 flex items-center gap-4 bg-gray-200 text-sm font-mono shrink-0"
        data-pages={pages.length}
        data-spreads={totalSpreads}
        data-selected={selectedCount}
        data-measuring={measuring}
      >
        <span>Pages: <strong id="page-count">{pages.length}</strong></span>
        <span>Spreads: <strong id="spread-count">{totalSpreads}</strong></span>
        <span>Selected: <strong id="selected-count">{selectedCount}</strong></span>
        <span>Measuring: <strong id="measuring-status">{measuring ? 'yes' : 'no'}</strong></span>
      </div>

      {/* BookPreview */}
      <div className="flex-1 flex">
        <BookPreview width={700} />
      </div>
    </div>
  )
}

export default function TestPreviewPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <I18nProvider>
        <CreateFlowProvider>
          <PreviewPanel />
        </CreateFlowProvider>
      </I18nProvider>
    </Suspense>
  )
}
