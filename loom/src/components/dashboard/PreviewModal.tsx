"use client";

import type { StoredPage } from "@loom/shared";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FlipContainer,
  SpreadSlider,
  SpreadViewerContainer,
  ZoomControls,
  ZoomTransform,
} from "@/components/ui/SpreadViewer";
import { useSpreadTocSync } from "@/hooks/useSpreadTocSync";
import { useSpreadViewer } from "@/hooks/useSpreadViewer";
import { useI18n } from "@/lib/i18n/context";
import type { TranslationKey } from "@/lib/i18n/translations";
import { PAGE_HEIGHT, PAGE_WIDTH } from "@/lib/pdf/constants";
import { generatePageHtml } from "@/lib/pdf/generator";
import { proxyImageUrls } from "@/lib/proxy";
import { useDashboard } from "./DashboardContext";

const MAX_PAGE_WIDTH = 400;

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
  const scale = pageWidth / PAGE_WIDTH;
  const pageHeight = Math.round(PAGE_HEIGHT * scale);

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
            width: `${PAGE_WIDTH}px`,
            height: `${PAGE_HEIGHT}px`,
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
  return Math.floor(pageNum / 2);
}

// ── TOC data extraction ──

interface TocEntry {
  type: "special" | "chapter" | "sub-chapter";
  label: string;
  labelKey?: TranslationKey;
  pageNumber: number;
  chapterIndex?: number; // for grouping collapse
}

function parseTocHtml(html: string): {
  chapters: {
    title: string;
    pageNum: number | null;
    subChapters: { title: string; pageNum: number | null }[];
  }[];
} {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const items = doc.querySelectorAll(".toc-item");
  const chapters: {
    title: string;
    pageNum: number | null;
    subChapters: { title: string; pageNum: number | null }[];
  }[] = [];

  items.forEach((item) => {
    const titleEl = item.querySelector(".toc-chapter-title");
    const titleSpan = titleEl?.querySelector("span");
    const titlePageEl = titleEl?.querySelector(".toc-page-number");
    const chTitle = titleSpan?.textContent?.trim() || "";
    const chPage = titlePageEl ? Number(titlePageEl.textContent) || null : null;

    const subs: { title: string; pageNum: number | null }[] = [];
    item.querySelectorAll(".toc-sub-chapter").forEach((subEl) => {
      const subSpan = subEl.querySelector("span");
      const subPageEl = subEl.querySelector(".toc-page-number");
      subs.push({
        title: subSpan?.textContent?.trim() || "",
        pageNum: subPageEl ? Number(subPageEl.textContent) || null : null,
      });
    });

    chapters.push({ title: chTitle, pageNum: chPage, subChapters: subs });
  });

  return { chapters };
}

function buildTocEntries(pages: StoredPage[]): TocEntry[] {
  const entries: TocEntry[] = [];

  // Add special pages (cover, preface, toc, last)
  for (let i = 0; i < pages.length; i++) {
    const { meta } = pages[i];
    const pageNum = i + 1;
    switch (meta.type) {
      case "cover":
        entries.push({
          type: "special",
          label: "",
          labelKey: "dashboard.preview.cover",
          pageNumber: pageNum,
        });
        break;
      case "preface":
        entries.push({
          type: "special",
          label: "",
          labelKey: "dashboard.preview.preface",
          pageNumber: pageNum,
        });
        break;
      case "toc":
        if (
          !entries.some(
            (e) => e.labelKey === "dashboard.preview.tableOfContents",
          )
        ) {
          entries.push({
            type: "special",
            label: "",
            labelKey: "dashboard.preview.tableOfContents",
            pageNumber: pageNum,
          });
        }
        break;
      case "last":
        entries.push({
          type: "special",
          label: "",
          labelKey: "dashboard.preview.last",
          pageNumber: pageNum,
        });
        break;
    }
  }

  // Parse chapters/sub-chapters from all TOC pages (may span multiple pages)
  const tocHtml = pages
    .filter((p) => p.meta.type === "toc")
    .map((p) => p.html)
    .join("");
  if (tocHtml) {
    const { chapters } = parseTocHtml(tocHtml);
    chapters.forEach((ch, chIdx) => {
      entries.push({
        type: "chapter",
        label: `${chIdx + 1}. ${ch.title}`,
        pageNumber: ch.pageNum ?? 1,
        chapterIndex: chIdx,
      });
      for (const sub of ch.subChapters) {
        entries.push({
          type: "sub-chapter",
          label: sub.title,
          pageNumber: sub.pageNum ?? 1,
          chapterIndex: chIdx,
        });
      }
    });
  }

  // Sort: specials first by page, then chapters/subs by page
  entries.sort((a, b) => a.pageNumber - b.pageNumber);

  return entries;
}

// ── TocPanel component ──

function ChapterChildren({
  entries,
  activePages,
  onNavigate,
  activeRef,
  t,
}: {
  entries: TocEntry[];
  activePages: Set<number>;
  onNavigate: (pageNum: number) => void;
  activeRef: React.RefObject<HTMLButtonElement | null>;
  t: (key: TranslationKey) => string;
}) {
  return (
    <>
      {entries.map((entry) => {
        const isActive = activePages.has(entry.pageNumber);
        const label = entry.labelKey ? t(entry.labelKey) : entry.label;
        return (
          <button
            key={`sub-${entry.pageNumber}`}
            ref={isActive ? activeRef : undefined}
            onClick={() => onNavigate(entry.pageNumber)}
            className={`w-full text-left pr-3 py-1.5 pl-8 text-xs truncate transition-colors duration-150 ${
              isActive
                ? "bg-[#f5f5f5] text-gray-900 font-medium"
                : "text-gray-500 hover:bg-[#fafafa]"
            }`}
          >
            {label}
          </button>
        );
      })}
    </>
  );
}

export function TocPanel({
  pages,
  visiblePages,
  onNavigate,
  children,
  className,
}: {
  pages: StoredPage[];
  visiblePages: Set<number>;
  onNavigate: (pageNum: number) => void;
  children?: ReactNode;
  className?: string;
}) {
  const { t } = useI18n();
  const entries = useMemo(() => buildTocEntries(pages), [pages]);
  const activeRef = useRef<HTMLButtonElement>(null);
  const [collapsed, setCollapsed] = useState<Set<number>>(() => {
    const all = new Set<number>();
    for (const e of buildTocEntries(pages)) {
      if (e.type === "chapter" && e.chapterIndex !== undefined) {
        all.add(e.chapterIndex);
      }
    }
    return all;
  });

  // Compute active entry pages.
  // Nearest-previous fallback only applies when both visible pages resolve
  // to the same entry, to avoid highlighting two entries simultaneously.
  const activePages = useMemo(() => {
    const result = new Set<number>();
    if (visiblePages.size === 0) return result;

    const findNearest = (page: number): TocEntry | null => {
      // Direct match on special pages
      const special = entries.find(
        (e) => e.type === "special" && e.pageNumber === page,
      );
      if (special) return special;

      // Nearest previous chapter/sub-chapter
      let nearest: TocEntry | null = null;
      for (const e of entries) {
        if (e.type === "special") continue;
        if (e.pageNumber <= page) {
          nearest = e;
        } else {
          break;
        }
      }
      return nearest;
    };

    const resolved = [...visiblePages].map(findNearest);
    const allSame =
      resolved.length > 0 &&
      resolved.every(
        (r) => r && resolved[0] && r.pageNumber === resolved[0].pageNumber,
      );

    if (allSame && resolved[0]) {
      result.add(resolved[0].pageNumber);
    } else {
      // Different entries — only use direct matches
      for (const vp of visiblePages) {
        const direct = entries.find((e) => e.pageNumber === vp);
        if (direct) result.add(direct.pageNumber);
      }
    }
    return result;
  }, [visiblePages, entries]);

  const toggleChapter = (chapterIndex: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(chapterIndex)) {
        next.delete(chapterIndex);
      } else {
        next.add(chapterIndex);
      }
      return next;
    });
  };

  // Auto-expand chapters that contain active sub-chapters
  useEffect(() => {
    if (activePages.size === 0) return;
    setCollapsed((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const e of entries) {
        if (
          e.type === "sub-chapter" &&
          e.chapterIndex !== undefined &&
          activePages.has(e.pageNumber) &&
          next.has(e.chapterIndex)
        ) {
          next.delete(e.chapterIndex);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [activePages, entries]);

  // Scroll active entry into view
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, []);

  // Group sub-chapters by their parent chapter index
  const chapterChildren = useMemo(() => {
    const map = new Map<number, TocEntry[]>();
    for (const e of entries) {
      if (e.type === "sub-chapter" && e.chapterIndex !== undefined) {
        if (!map.has(e.chapterIndex)) map.set(e.chapterIndex, []);
        map.get(e.chapterIndex)?.push(e);
      }
    }
    return map;
  }, [entries]);

  return (
    <div
      className={
        className ??
        "hidden lg:flex flex-col w-56 bg-white border-l border-gray-200 shrink-0"
      }
    >
      {/* <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {t("dashboard.preview.toc")}
        </h3>
      </div> */}
      <div className="flex-1 overflow-y-auto py-1 scrollbar-stable">
        {entries.map((entry) => {
          // Sub-chapters are rendered inside their parent chapter's collapsible area
          if (entry.type === "sub-chapter") return null;

          const isActive = activePages.has(entry.pageNumber);
          const label = entry.labelKey ? t(entry.labelKey) : entry.label;

          if (entry.type === "special") {
            return (
              <button
                key={`special-${entry.pageNumber}`}
                ref={isActive ? activeRef : undefined}
                onClick={() => onNavigate(entry.pageNumber)}
                className={`w-full text-left pr-3 py-1.5 pl-4 text-xs font-semibold truncate transition-colors duration-150 ${
                  isActive
                    ? "bg-[#f5f5f5] text-gray-900"
                    : "text-gray-900 hover:bg-[#fafafa]"
                }`}
              >
                {label}
              </button>
            );
          }

          // Chapter entry with collapsible children
          const isCollapsed =
            entry.chapterIndex !== undefined &&
            collapsed.has(entry.chapterIndex);
          const children =
            entry.chapterIndex !== undefined
              ? (chapterChildren.get(entry.chapterIndex) ?? [])
              : [];

          return (
            <div key={`ch-${entry.pageNumber}`}>
              <button
                ref={isActive ? activeRef : undefined}
                onClick={() => {
                  if (entry.chapterIndex !== undefined && children.length > 0) {
                    toggleChapter(entry.chapterIndex);
                  }
                  onNavigate(entry.pageNumber);
                }}
                className={`w-full text-left pr-3 py-1.5 pl-4 text-xs font-semibold truncate flex items-center gap-1 mt-1 transition-colors duration-150 ${
                  isActive
                    ? "bg-[#f5f5f5] text-gray-900"
                    : "text-gray-900 hover:bg-[#fafafa]"
                }`}
              >
                {children.length > 0 && (
                  <svg
                    className={`w-3 h-3 shrink-0 transition-transform duration-200 ${isCollapsed ? "" : "rotate-90"}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                )}
                <span className="truncate">{label}</span>
              </button>
              {children.length > 0 && (
                <div
                  className="overflow-hidden transition-[grid-template-rows] duration-200 ease-in-out grid"
                  style={{ gridTemplateRows: isCollapsed ? "0fr" : "1fr" }}
                >
                  <div className="min-h-0">
                    <ChapterChildren
                      entries={children}
                      activePages={activePages}
                      onNavigate={onNavigate}
                      activeRef={activeRef}
                      t={t}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {children}
    </div>
  );
}

// ── HtmlSpreadViewer ──

export function HtmlSpreadViewer({
  pages,
  initialPage,
  onNavigateReady,
  onSpreadChange,
}: {
  pages: StoredPage[];
  initialPage?: number | null;
  onNavigateReady?: (fn: (pageNum: number) => void) => void;
  onSpreadChange?: (left: number | null, right: number | null) => void;
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

  // Expose navigate function to parent
  const navigateTo = useCallback(
    (pageNum: number) => {
      const targetSpread = pageToSpread(pageNum);
      if (targetSpread < totalSpreads) {
        handleSliderChange(targetSpread);
      }
    },
    [totalSpreads, handleSliderChange],
  );

  useEffect(() => {
    onNavigateReady?.(navigateTo);
  }, [navigateTo, onNavigateReady]);

  // Report current visible pages to parent
  const currentData = spreads[currentSpread] ?? null;
  useEffect(() => {
    if (currentData) {
      onSpreadChange?.(currentData.leftPage, currentData.rightPage);
    }
  }, [currentData, onSpreadChange]);

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
        <div className="h-[69px] px-8 flex items-center gap-4 bg-white border-t border-gray-200 shrink-0">
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

  const {
    visiblePages,
    handleNavigateReady,
    handleSpreadChange,
    handleTocNavigate,
  } = useSpreadTocSync();

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
          <div className="flex flex-1 overflow-hidden">
            <div className="flex flex-col flex-1 min-w-0">
              <HtmlSpreadViewer
                key={previewPages.length}
                pages={previewPages}
                initialPage={initialPage}
                onNavigateReady={handleNavigateReady}
                onSpreadChange={handleSpreadChange}
              />
            </div>
            <TocPanel
              pages={previewPages}
              visiblePages={visiblePages}
              onNavigate={handleTocNavigate}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-500">{t("dashboard.preview.error")}</p>
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
