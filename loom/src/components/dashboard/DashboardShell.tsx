"use client";

import { useResizable } from "@/hooks/useResizable";
import { User } from "@supabase/supabase-js";
import { Database } from "@loom/shared";
import { DashboardProvider, useDashboard } from "./DashboardContext";
import { Sidebar } from "./Sidebar";
import { LoomsTab } from "./LoomsTab";
import { LoomPreviewPanel } from "./LoomPreviewPanel";
import { CreateTabContent, CreateTabRightPanel } from "./CreateTab";
import { SettingTab } from "./SettingTab";
import { CreateFlowProvider } from "@/components/create/CreateFlowProvider";
import dynamic from "next/dynamic";

const PreviewModal = dynamic(
  () => import("./PreviewModal").then((mod) => mod.PreviewModal),
  { ssr: false },
);

type Loom = Database["public"]["Tables"]["looms"]["Row"];

interface DashboardShellProps {
  user: User;
  initialLooms: Loom[];
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
  );
}

function DashboardContent({ user }: { user: User }) {
  const { activeTab, addLoom } = useDashboard();

  const {
    width: previewWidth,
    isResizing,
    handleMouseDown: handleResizeStart,
    containerRef,
  } = useResizable(450, 300, 900);

  const {
    width: createPreviewWidth,
    isResizing: isCreateResizing,
    handleMouseDown: handleCreateResizeStart,
    containerRef: createContainerRef,
  } = useResizable(450, 300, 900);

  return (
    <>
      {/* Looms tab */}
      <div
        ref={containerRef}
        className={`flex-1 flex overflow-hidden ${activeTab !== "looms" ? "hidden" : "[animation:dashboard-panel-fade_0.2s_ease-out]"}`}
      >
        <LoomsTab />
        <div
          onMouseDown={handleResizeStart}
          className={`w-1 shrink-0 cursor-col-resize transition-colors duration-150 ${isResizing ? "bg-gray-400" : "hover:bg-gray-300"}`}
        />
        <LoomPreviewPanel width={previewWidth} />
      </div>

      {/* Create tab - always mounted, hidden via CSS to preserve state */}
      <CreateFlowProvider onComplete={addLoom}>
        <div
          ref={createContainerRef}
          className={`flex-1 flex overflow-hidden ${activeTab !== "create" ? "hidden" : "[animation:dashboard-panel-fade_0.2s_ease-out]"}`}
        >
          <CreateTabContent />
          <div
            onMouseDown={handleCreateResizeStart}
            className={`w-1 shrink-0 cursor-col-resize transition-colors duration-150 ${isCreateResizing ? "bg-gray-400" : "hover:bg-gray-300"}`}
          />
          <CreateTabRightPanel width={createPreviewWidth} />
        </div>
      </CreateFlowProvider>

      {/* Setting tab */}
      <div
        className={`flex-1 flex overflow-hidden ${activeTab !== "setting" ? "hidden" : "[animation:dashboard-panel-fade_0.2s_ease-out]"}`}
      >
        <SettingTab user={user} />
      </div>
    </>
  );
}
