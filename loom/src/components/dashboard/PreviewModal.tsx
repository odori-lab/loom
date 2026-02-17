"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { StoredPage } from "@loom/shared";
import { useDashboard } from "./DashboardContext";
import { useI18n } from "@/lib/i18n/context";
import { useSpreadViewer } from "@/hooks/useSpreadViewer";
import { generatePageHtml } from "@/lib/pdf/generator";
import {
  FlipContainer,
  SpreadViewerContainer,
  ZoomTransform,
  SpreadSlider,
  ZoomControls,
} from "@/components/ui/SpreadViewer";

// Source page dimensions (A5 at 96dpi)
const SOURCE_WIDTH = 559;
const SOURCE_HEIGHT = 793;
const MAX_PAGE_WIDTH = 400;

function proxyImageUrls(html: string): string {
  return html.replace(
    /(<img\s[^>]*src=")([^"]+cdninstagram\.com[^"]+)(")/g,
    (_match, before, url, after) =>
      `${before}/api/proxy-image?url=${encodeURIComponent(url)}${after}`,
  );
}

interface SpreadData {
  leftPage: number | null;
  rightPage: number | null;
}

function buildSpreads(numPages: number): SpreadData[] {
  if (numPages === 0) return [];
  const spreads: SpreadData[] = [];
  spreads.push({ leftPage: null, rightPage: 1 });
  let page = 2;
  while (page <= numPages) {
    const left = page;
    const right = page + 1 <= numPages ? page + 1 : null;
    spreads.push({ leftPage: left, rightPage: right });
    page += 2;
  }
  return spreads;
}

function HtmlPage({
  pageNum,
  pages,
  side,
  noShadow = false,
  pageWidth,
}: {
  pageNum: number | null;
  pages: StoredPage[];
  side: "left" | "right";
  noShadow?: boolean;
  pageWidth: number;
}) {
  const rounded = side === "left" ? "rounded-l-lg" : "rounded-r-lg";
  const shadow = noShadow ? "" : "shadow-xl";
  const scale = pageWidth / SOURCE_WIDTH;
  const pageHeight = Math.round(SOURCE_HEIGHT * scale);

  if (pageNum && pages[pageNum - 1]) {
    const html = pages[pageNum - 1].html;
    return (
      <div
        className={`overflow-hidden ${rounded} ${shadow} bg-white`}
        style={{ width: pageWidth, height: pageHeight }}
      >
        <iframe
          srcDoc={generatePageHtml(proxyImageUrls(html))}
          className="bg-white pointer-events-none"
          scrolling="no"
          style={{
            width: `${SOURCE_WIDTH}px`,
            height: `${SOURCE_HEIGHT}px`,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            border: "none",
            overflow: "hidden",
          }}
          title={`Page ${pageNum}`}
        />
      </div>
    );
  }
  return (
    <div
      className={`bg-gray-200 ${rounded} ${shadow}`}
      style={{ width: pageWidth, aspectRatio: "148 / 210" }}
    />
  );
}

function pageToSpread(pageNum: number): number {
  return Math.max(0, Math.ceil(pageNum / 2));
}

function HtmlSpreadViewer({
  pages,
  initialPage,
}: {
  pages: StoredPage[];
  initialPage?: number | null;
}) {
  const numPages = pages.length;
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const pageWidth =
    containerWidth > 0
      ? Math.min(MAX_PAGE_WIDTH, Math.floor((containerWidth - 192) / 2))
      : MAX_PAGE_WIDTH;
  const pageHeight = Math.round(pageWidth * (210 / 148));

  const spreads = useMemo(() => buildSpreads(numPages), [numPages]);
  const totalSpreads = spreads.length;

  const {
    currentSpread,
    flipState,
    scale,
    offset,
    isDragging,
    prevSpread,
    nextSpread,
    handleFlipEnd,
    zoomIn,
    zoomOut,
    resetZoom,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleSliderChange,
  } = useSpreadViewer({
    totalSpreads,
    pageWidth,
    pageHeight,
    containerRef,
  });

  const initialPageApplied = useRef(false);
  useEffect(() => {
    if (
      initialPage &&
      numPages > 0 &&
      totalSpreads > 0 &&
      !initialPageApplied.current
    ) {
      const targetSpread = pageToSpread(initialPage);
      if (targetSpread < totalSpreads) {
        handleSliderChange(targetSpread);
      }
      initialPageApplied.current = true;
    }
  }, [initialPage, numPages, totalSpreads, handleSliderChange]);

  const currentData = spreads[currentSpread] ?? null;
  const targetData = flipState
    ? (spreads[flipState.targetSpread] ?? null)
    : null;

  const renderPage = useMemo(() => {
    return function renderPage(
      pageNum: number | null,
      side: "left" | "right",
      noShadow?: boolean,
    ) {
      return (
        <HtmlPage
          pageNum={pageNum}
          pages={pages}
          side={side}
          noShadow={noShadow}
          pageWidth={pageWidth}
        />
      );
    };
  }, [pageWidth, pages]);

  return (
    <>
      <SpreadViewerContainer
        containerRef={containerRef}
        scale={scale}
        isDragging={isDragging}
        resetZoom={resetZoom}
        handleMouseDown={handleMouseDown}
        handleMouseMove={handleMouseMove}
        handleMouseUp={handleMouseUp}
        currentSpread={currentSpread}
        totalSpreads={totalSpreads}
        flipState={flipState}
        prevSpread={prevSpread}
        nextSpread={nextSpread}
      >
        {numPages > 0 && currentData && (
          <div className="h-full flex items-center justify-center">
            <ZoomTransform
              scale={scale}
              offset={offset}
              isDragging={isDragging}
            >
              <FlipContainer<number | null>
                flipState={flipState}
                handleFlipEnd={handleFlipEnd}
                pageWidth={pageWidth}
                current={{
                  left: currentData.leftPage,
                  right: currentData.rightPage,
                }}
                target={
                  targetData
                    ? {
                        left: targetData.leftPage,
                        right: targetData.rightPage,
                      }
                    : null
                }
                renderPage={renderPage}
              />
            </ZoomTransform>
          </div>
        )}
      </SpreadViewerContainer>

      {totalSpreads > 0 && (
        <div className="h-16 px-8 flex items-center gap-4 bg-white border-t border-gray-200 shrink-0">
          <SpreadSlider
            currentSpread={currentSpread}
            totalSpreads={totalSpreads}
            onSliderChange={handleSliderChange}
          />
          <div className="ml-2">
            <ZoomControls
              scale={scale}
              zoomIn={zoomIn}
              zoomOut={zoomOut}
              resetZoom={resetZoom}
            />
          </div>
        </div>
      )}
    </>
  );
}

export function PreviewModal() {
  const { t } = useI18n();
  const {
    previewModalOpen,
    previewPages,
    previewUrl,
    loadingPreview,
    selectedLoom,
    closePreviewModal,
    initialPage,
  } = useDashboard();

  // Escape key to close modal
  useEffect(() => {
    if (!previewModalOpen) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePreviewModal();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [previewModalOpen, closePreviewModal]);

  if (!previewModalOpen || (!selectedLoom && !previewPages)) return null;

  // Parse cover_data for profile image and name
  const coverData = selectedLoom?.cover_data as {
    profileImageUrl?: string;
    name?: string;
    username?: string;
  } | null;
  const profileImageUrl = coverData?.profileImageUrl;
  const displayName =
    selectedLoom?.title ||
    coverData?.name ||
    selectedLoom?.thread_display_name ||
    `@${selectedLoom?.thread_username}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
      style={{ animationDuration: "0.15s" }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={closePreviewModal}
      />

      {/* Modal container */}
      <div
        className="relative z-10 w-[90vw] h-[90vh] bg-gray-100 rounded-2xl overflow-hidden flex flex-col shadow-2xl animate-fade-in-up"
        style={{ animationDuration: "0.2s" }}
      >
        {/* Header */}
        <div className="h-14 px-6 flex items-center justify-between bg-white border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
            {selectedLoom ? (
              <>
                {profileImageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={`/api/proxy-image?url=${encodeURIComponent(profileImageUrl)}`}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover border border-gray-200"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">
                      {(selectedLoom.thread_display_name ||
                        selectedLoom.thread_username)?.[0]?.toUpperCase() ||
                        "?"}
                    </span>
                  </div>
                )}
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">
                    {displayName}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {selectedLoom.post_count} {t("create.preview.posts")}
                  </p>
                </div>
              </>
            ) : (
              <h2 className="text-sm font-semibold text-gray-900">
                {t("dashboard.preview.title")}
              </h2>
            )}
          </div>
          <button
            onClick={closePreviewModal}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 active:scale-[0.97] transition-all duration-150"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content area */}
        {loadingPreview ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full border-4 border-gray-200 border-t-gray-900 animate-spin" />
              <p className="text-sm text-gray-500">
                {t("dashboard.preview.loading")}
              </p>
            </div>
          </div>
        ) : previewPages ? (
          <HtmlSpreadViewer
            key={previewPages.length}
            pages={previewPages}
            initialPage={initialPage}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-500">
                {t("dashboard.preview.error")}
              </p>
              {previewUrl && (
                <a
                  href={previewUrl}
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
