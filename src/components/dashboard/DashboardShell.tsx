'use client'

import { User } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { DashboardProvider, useDashboard } from './DashboardContext'
import { Sidebar } from './Sidebar'
import { LoomsTab } from './LoomsTab'
import { LoomPreviewPanel } from './LoomPreviewPanel'
import { CreateTabContent, CreateTabRightPanel } from './CreateTab'
import { CreateFlowProvider } from '@/components/create/CreateFlowProvider'
import dynamic from 'next/dynamic'

const PreviewModal = dynamic(
  () => import('./PreviewModal').then((mod) => mod.PreviewModal),
  { ssr: false }
)

type Loom = Database['public']['Tables']['looms']['Row']

interface DashboardShellProps {
  user: User
  initialLooms: Loom[]
}

export function DashboardShell({ user, initialLooms }: DashboardShellProps) {
  return (
    <DashboardProvider initialLooms={initialLooms}>
      <div className="h-screen flex bg-white">
        <Sidebar user={user} />
        <DashboardContent />
        <PreviewModal />
      </div>
    </DashboardProvider>
  )
}

function DashboardContent() {
  const { activeTab, addLoom } = useDashboard()

  return (
    <>
      {/* Looms tab */}
      <div className={`flex-1 flex overflow-hidden ${activeTab !== 'looms' ? 'hidden' : '[animation:dashboard-panel-fade_0.2s_ease-out]'}`}>
        <LoomsTab />
        <LoomPreviewPanel />
      </div>

      {/* Create tab - always mounted, hidden via CSS to preserve state */}
      <CreateFlowProvider onComplete={addLoom}>
        <div className={`flex-1 flex overflow-hidden ${activeTab !== 'create' ? 'hidden' : '[animation:dashboard-panel-fade_0.2s_ease-out]'}`}>
          <CreateTabContent />
          <CreateTabRightPanel />
        </div>
      </CreateFlowProvider>
    </>
  )
}
