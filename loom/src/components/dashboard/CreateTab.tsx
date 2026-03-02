"use client";

import dynamic from "next/dynamic";
import { CompleteStep } from "@/components/create/CompleteStep";
import { useCreateFlow } from "@/components/create/CreateFlowContext";
import { ErrorBanner } from "@/components/create/ErrorBanner";
import { ProgressIndicator } from "@/components/create/ProgressIndicator";
import { UsernameStep } from "@/components/create/UsernameStep";
import { WorkerLoadingView } from "@/components/create/WorkerLoadingView";
import { useSpreadTocSync } from "@/hooks/useSpreadTocSync";
import { useI18n } from "@/lib/i18n/context";
import { proxyImageUrl } from "@/lib/proxy";
import { useDashboard } from "./DashboardContext";

const HtmlSpreadViewer = dynamic(
  () => import("./PreviewModal").then((mod) => mod.HtmlSpreadViewer),
  { ssr: false },
);

const TocPanel = dynamic(
  () => import("./PreviewModal").then((mod) => mod.TocPanel),
  { ssr: false },
);

export function CreateTabContent() {
  const {
    state: { step, profile, loading, loadingPhase, workerProgress, workerMessage },
  } = useCreateFlow();
  const { setActiveTab } = useDashboard();

  // Show loading view during scraping/organizing phases
  if (loading && loadingPhase !== "idle") {
    return (
      <WorkerLoadingView
        scenario="submit"
        progress={workerProgress}
        message={workerMessage}
        loadingPhase={loadingPhase}
      />
    );
  }

  if (step === "organize" && profile) {
    return <OrganizeView />;
  }

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center"
      style={{ animation: "fadeIn 0.3s ease-out both" }}
    >
      <div className="w-full max-w-3xl mx-auto px-6" key={step}>
        <div
          className="flex items-center justify-center mb-16"
          style={{ animation: "fadeInUp 0.5s ease-out both" }}
        >
          <ProgressIndicator />
        </div>

        <ErrorBanner className="mb-8" />

        {step === "username" && <UsernameStep />}
        {step === "complete" && (
          <CompleteStep onViewLooms={() => setActiveTab("looms")} />
        )}
      </div>
    </div>
  );
}

function OrganizeView() {
  const {
    state: { organizing, loading, measuring, profile, bookStructure, workerProgress, workerMessage },
    actions: { generateLoom },
    meta: { pages, orderedPosts },
  } = useCreateFlow();

  // Show worker loading view during PDF generation
  if (loading) {
    return (
      <WorkerLoadingView
        scenario="generate"
        progress={workerProgress}
        message={workerMessage}
        loadingPhase="idle"
      />
    );
  }
  const { t } = useI18n();

  const {
    visiblePages,
    handleNavigateReady,
    handleSpreadChange,
    handleTocNavigate,
  } = useSpreadTocSync();

  const isLoading = organizing || measuring;
  const hasPages = pages.length > 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-16 px-6 flex items-center gap-3 bg-white border-b border-gray-200 shrink-0">
        {profile?.profileImageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={proxyImageUrl(profile.profileImageUrl)}
            alt=""
            className="w-8 h-8 rounded-full object-cover border border-gray-200"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <span className="text-xs font-bold text-white">
              {profile?.username?.[0]?.toUpperCase() ?? "?"}
            </span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-gray-900 truncate">
            {bookStructure?.title ?? `@${profile?.username}`}
          </h2>
          <p className="text-xs text-gray-500">
            {orderedPosts.length} {t("create.preview.posts")}
          </p>
        </div>
        <ProgressIndicator compact />
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Spread viewer - main area */}
        <div className="flex flex-col flex-1 min-w-0 bg-gray-100">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full border-4 border-gray-200 border-t-gray-900 animate-spin" />
                <p className="text-sm text-gray-500">
                  {t("create.organize.organizing")}
                </p>
              </div>
            </div>
          ) : hasPages ? (
            <HtmlSpreadViewer
              key={pages.length}
              pages={pages}
              onNavigateReady={handleNavigateReady}
              onSpreadChange={handleSpreadChange}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-gray-400">
                {t("create.organize.noStructure")}
              </p>
            </div>
          )}
        </div>

        {/* TOC Panel + Generate button */}
        {hasPages && !isLoading && (
          <TocPanel
            pages={pages}
            visiblePages={visiblePages}
            onNavigate={handleTocNavigate}
          >
            <div className="h-[69px] px-4 py-3 border-t border-gray-200 shrink-0">
              <button
                onClick={generateLoom}
                disabled={organizing || orderedPosts.length === 0 || loading}
                className="w-full py-2.5 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-xl transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 relative overflow-hidden"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t("create.preview.generating")}
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent"
                      style={{
                        animation: "shimmer 1.5s infinite linear",
                        backgroundSize: "200% 100%",
                      }}
                    />
                  </>
                ) : (
                  <>
                    {t("create.organize.generate")}
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </TocPanel>
        )}
      </div>
    </div>
  );
}
