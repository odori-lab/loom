'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { DashboardProvider, useDashboard } from './DashboardContext'
import { Sidebar } from './Sidebar'
import { LoomsTab } from './LoomsTab'
import { LoomPreviewPanel } from './LoomPreviewPanel'
import { CreateTabContent, CreateTabRightPanel } from './CreateTab'
import { SettingTab } from './SettingTab'
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
        <DashboardContent user={user} />
        <PreviewModal />
      </div>
    </DashboardProvider>
  )
}

function DashboardContent({ user }: { user: User }) {
  const { activeTab, addLoom } = useDashboard()
  const [previewWidth, setPreviewWidth] = useState(600)
  const [isResizing, setIsResizing] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Create tab resizable panel (independent from looms tab)
  const [createPreviewWidth, setCreatePreviewWidth] = useState(600)
  const [isCreateResizing, setIsCreateResizing] = useState(false)
  const createContainerRef = useRef<HTMLDivElement>(null)

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  const handleCreateResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsCreateResizing(true)
  }, [])

  useEffect(() => {
    if (!isResizing) return
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const newWidth = rect.right - e.clientX
      setPreviewWidth(Math.max(300, Math.min(900, newWidth)))
    }
    const handleMouseUp = () => setIsResizing(false)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing])

  useEffect(() => {
    if (!isCreateResizing) return
    const handleMouseMove = (e: MouseEvent) => {
      if (!createContainerRef.current) return
      const rect = createContainerRef.current.getBoundingClientRect()
      const newWidth = rect.right - e.clientX
      setCreatePreviewWidth(Math.max(680, Math.min(900, newWidth)))
    }
    const handleMouseUp = () => setIsCreateResizing(false)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isCreateResizing])

  return (
    <>
      {/* Looms tab */}
      <div ref={containerRef} className={`flex-1 flex overflow-hidden ${activeTab !== 'looms' ? 'hidden' : '[animation:dashboard-panel-fade_0.2s_ease-out]'}`}>
        <LoomsTab />
        <div
          onMouseDown={handleResizeStart}
          className={`w-1 shrink-0 cursor-col-resize transition-colors duration-150 ${isResizing ? 'bg-gray-400' : 'hover:bg-gray-300'}`}
        />
        <LoomPreviewPanel width={previewWidth} />
      </div>

      {/* Create tab - always mounted, hidden via CSS to preserve state */}
      <CreateFlowProvider onComplete={addLoom}>
        <div ref={createContainerRef} className={`flex-1 flex overflow-hidden ${activeTab !== 'create' ? 'hidden' : '[animation:dashboard-panel-fade_0.2s_ease-out]'}`}>
          <CreateTabContent />
          <div
            onMouseDown={handleCreateResizeStart}
            className={`w-1 shrink-0 cursor-col-resize transition-colors duration-150 ${isCreateResizing ? 'bg-gray-400' : 'hover:bg-gray-300'}`}
          />
          <CreateTabRightPanel width={createPreviewWidth} />
        </div>
      </CreateFlowProvider>

      {/* Setting tab */}
      <div className={`flex-1 flex overflow-hidden ${activeTab !== 'setting' ? 'hidden' : '[animation:dashboard-panel-fade_0.2s_ease-out]'}`}>
        <SettingTab user={user} />
      </div>
    </>
  )
}
