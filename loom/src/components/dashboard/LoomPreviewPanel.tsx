"use client";

import dynamic from "next/dynamic";
import { ReactNode } from "react";
import { useI18n } from "@/lib/i18n/context";
import { useDashboard } from "./DashboardContext";

const PageListViewer = dynamic(
  () =>
    import("@/components/ui/PageListViewer").then((mod) => mod.PageListViewer),
  { ssr: false },
);

export interface LoomPreviewPanelProps {
  width?: number;
  /** Override pages (bypasses DashboardContext) */
  pages?: string[];
  /** Override loading state */
  loading?: boolean;
  /** Override page click handler */
  onPageClick?: () => void;
  /** Custom empty state (shown when no content is active) */
  emptyState?: ReactNode;
  /** Whether there is active content to display. Defaults to checking selectedLoom from context. */
  active?: boolean;
  /** Custom content to render instead of the viewer */
  children?: ReactNode;
}

export function LoomPreviewPanel({
  width,
  pages: propPages,
  loading: propLoading,
  onPageClick: propOnPageClick,
  emptyState,
  active: propActive,
  children,
}: LoomPreviewPanelProps) {
  const dashboard = useDashboard();
  const { t } = useI18n();

  const isActive = propActive ?? !!dashboard.selectedLoom;
  const pages =
    propPages ?? dashboard.previewPages?.map((p) => p.html) ?? null;
  const loadingPreview = propLoading ?? dashboard.loadingPreview;
  const handlePageClick =
    propOnPageClick ?? (() => dashboard.openPreviewModal());

  const panelWidth = width;

  // Shell-only mode: when children are provided, render the panel shell with custom content
  if (children) {
    return (
      <div
        className="bg-gray-50 border-l border-gray-100 flex flex-col shrink-0"
        style={{ width: panelWidth }}
      >
        {children}
      </div>
    );
  }

  if (!isActive) {
    return (
      <div
        className="bg-gray-50 border-l border-gray-100 flex items-center justify-center shrink-0"
        style={{ width: panelWidth }}
      >
        {emptyState ?? (
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gray-200/50 flex items-center justify-center">
              <svg
                className="w-10 h-10 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">
              {t("dashboard.preview.select")}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {t("dashboard.preview.hint")}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="bg-gray-50 border-l border-gray-100 flex flex-col shrink-0"
      style={{ width: panelWidth }}
    >
      <div className="flex-1 overflow-hidden">
        {/* 이중 loading fallback */}
        {loadingPreview ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full border-4 border-gray-200 border-t-gray-900 animate-spin" />
              <p className="text-sm text-gray-500">
                {t("dashboard.preview.loading")}
              </p>
            </div>
          </div>
        ) : pages ? (
          <PageListViewer
            pages={pages}
            width={panelWidth}
            onPageClick={() => handlePageClick()}
          />
        ) : emptyState ? (
          <div className="h-full flex items-center justify-center">
            {emptyState}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-500 text-sm">
                {t("dashboard.preview.error")}
              </p>
              {dashboard.previewUrl && (
                <a
                  href={dashboard.previewUrl}
                  download
                  className="mt-3 inline-block text-sm font-medium text-black underline"
                >
                  {t("dashboard.preview.downloadPdf")}
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
