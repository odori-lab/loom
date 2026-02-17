"use client";

import { useState, useMemo } from "react";
import { useDashboard } from "./DashboardContext";
import { SpinnerSvg } from "@/components/ui/Spinner";
import {
  TrashIcon,
  PlusIcon,
  BookOpenIcon,
  SearchIcon,
  DownloadIcon,
  ChevronRightIcon,
} from "@/components/ui/Icons";
import { useI18n } from "@/lib/i18n/context";
import { Json, BookStructure, BookChapter } from "@loom/shared";

type SortOrder = "newest" | "oldest";

interface CoverDataShape {
  name?: string;
  username?: string;
  bio?: string;
  profileImageUrl?: string;
  followerCount?: number;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function parseCoverData(raw: Json | null): CoverDataShape | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as unknown as CoverDataShape;
}

function parseBookStructure(raw: Json | null): BookStructure | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  if (!obj.chapters || !Array.isArray(obj.chapters)) return null;
  return raw as unknown as BookStructure;
}

function proxyImageUrl(url: string): string {
  return `/api/proxy-image?url=${encodeURIComponent(url)}`;
}

function getBookTitle(
  title: string | null,
  coverData: CoverDataShape | null,
  displayName: string | null,
  username: string,
): string {
  if (title) return title;
  if (coverData?.name) return coverData.name;
  if (displayName) return displayName;
  return `@${username}`;
}

export function LoomsTab() {
  const {
    looms,
    selectedLoom,
    deletingId,
    selectLoom,
    deleteLoom,
    setActiveTab,
    openPreviewModal,
  } = useDashboard();
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [expandedLoomId, setExpandedLoomId] = useState<string | null>(null);

  const filteredLooms = useMemo(() => {
    let result = [...looms];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          (l.thread_display_name || "").toLowerCase().includes(q) ||
          l.thread_username.toLowerCase().includes(q),
      );
    }
    return result.toSorted((a, b) => {
      const diff =
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return sortOrder === "newest" ? diff : -diff;
    });
  }, [looms, searchQuery, sortOrder]);

  const handleDownload = async (e: React.MouseEvent, loomId: string) => {
    e.stopPropagation();
    setDownloadingId(loomId);
    try {
      const res = await fetch(`/api/looms/${loomId}`);
      const data = await res.json();
      if (data.downloadUrl) {
        window.open(data.downloadUrl, "_blank");
      }
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleRowClick = (loom: (typeof looms)[0]) => {
    selectLoom(loom);
    setExpandedLoomId((prev) => (prev === loom.id ? null : loom.id));
  };

  const handleChapterClick = (e: React.MouseEvent, startPage?: number) => {
    e.stopPropagation();
    openPreviewModal(startPage);
  };

  if (looms.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center py-16 px-8">
          <div
            className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center shadow-sm"
            style={{ animation: "dashboard-float 3s ease-in-out infinite" }}
          >
            <BookOpenIcon className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {t("dashboard.empty.title")}
          </h3>
          <p className="text-gray-500 mb-8 max-w-sm">
            {t("dashboard.empty.description")}
          </p>
          <button
            onClick={() => setActiveTab("create")}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-full font-medium hover:bg-gray-800 hover:scale-105 transition-all shadow-lg shadow-gray-900/20 active:scale-[0.96]"
          >
            <PlusIcon className="w-5 h-5" />
            {t("dashboard.empty.cta")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Controls */}
      <div className="h-12 px-6 flex gap-3 items-center justify-end">
        <p className="text-xs text-gray-400">
          {looms.length}{" "}
          {looms.length === 1
            ? t("dashboard.loom")
            : t("dashboard.looms_count")}
        </p>
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as SortOrder)}
          className="px-2 py-1 bg-gray-100 border-0 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-gray-300 h-7"
        >
          <option value="newest">{t("dashboard.newest")}</option>
          <option value="oldest">{t("dashboard.oldest")}</option>
        </select>
        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder={t("dashboard.search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1 bg-gray-100 border-0 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-gray-300 w-40 h-7"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="flex flex-col gap-1">
          {filteredLooms.map((loom, index) => {
            const coverData = parseCoverData(loom.cover_data);
            const profileImg = coverData?.profileImageUrl;
            const title = getBookTitle(
              loom.title,
              coverData,
              loom.thread_display_name,
              loom.thread_username,
            );
            const displayName =
              loom.thread_display_name ||
              coverData?.name ||
              `@${loom.thread_username}`;
            const isExpanded = expandedLoomId === loom.id;
            const isSelected = selectedLoom?.id === loom.id;
            const bookStructure = parseBookStructure(loom.book_structure);
            const chapters = bookStructure?.chapters || [];

            return (
              <div
                key={loom.id}
                style={{
                  animationDelay: `${index * 40}ms`,
                  contentVisibility: "auto",
                }}
                className="[animation:dashboard-card-enter_0.3s_ease-out_both]"
              >
                {/* Loom row */}
                <div
                  onClick={() => handleRowClick(loom)}
                  className={`group flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all active:scale-[0.99] ${
                    isSelected ? "bg-gray-900 text-white" : "hover:bg-[#fafafa]"
                  }`}
                >
                  {/* Expand chevron */}
                  <div
                    className={`flex-shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                  >
                    <ChevronRightIcon
                      className={`w-4 h-4 ${isSelected ? "text-gray-400" : "text-gray-300"}`}
                    />
                  </div>

                  {/* Profile image */}
                  {profileImg ? (
                    <img
                      src={proxyImageUrl(profileImg)}
                      alt={displayName}
                      className="w-9 h-9 rounded-full border border-[#e0e0e0] object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full border border-[#e0e0e0] bg-[#f5f5f5] flex items-center justify-center flex-shrink-0">
                      <span
                        className={`text-xs font-medium ${isSelected ? "text-gray-400" : "text-[#999999]"}`}
                      >
                        {(displayName[0] || "?").toUpperCase()}
                      </span>
                    </div>
                  )}

                  {/* Title and username */}
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-semibold truncate leading-tight ${isSelected ? "text-white" : "text-gray-900"}`}
                    >
                      {title}
                    </p>
                    <p
                      className={`text-xs truncate leading-tight mt-0.5 ${isSelected ? "text-gray-400" : "text-[#999999]"}`}
                    >
                      @{loom.thread_username}
                    </p>
                  </div>

                  {/* Post count badge */}
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium flex-shrink-0 ${
                      isSelected
                        ? "bg-white/15 text-gray-300"
                        : "bg-gray-100 text-[#737373]"
                    }`}
                  >
                    {loom.post_count} {loom.post_count === 1 ? "post" : "posts"}
                  </span>

                  {/* Date */}
                  <span
                    className={`text-xs flex-shrink-0 hidden sm:block ${isSelected ? "text-gray-400" : "text-[#999999]"}`}
                  >
                    {formatDate(loom.created_at)}
                  </span>

                  {/* Action buttons */}
                  <div
                    className={`flex gap-1 flex-shrink-0 ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-opacity duration-150`}
                  >
                    <button
                      onClick={(e) => handleDownload(e, loom.id)}
                      disabled={downloadingId === loom.id}
                      className={`p-1.5 rounded-lg transition-all disabled:opacity-50 active:scale-[0.96] ${
                        isSelected
                          ? "text-gray-400 hover:text-white hover:bg-white/10"
                          : "text-gray-400 hover:text-gray-900 hover:bg-gray-100"
                      }`}
                      title="Download"
                    >
                      {downloadingId === loom.id ? (
                        <SpinnerSvg />
                      ) : (
                        <DownloadIcon className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteLoom(loom.id);
                      }}
                      disabled={deletingId === loom.id}
                      className={`p-1.5 rounded-lg transition-all disabled:opacity-50 active:scale-[0.96] ${
                        isSelected
                          ? "text-gray-400 hover:text-red-400 hover:bg-white/10"
                          : "text-gray-400 hover:text-red-500 hover:bg-gray-100"
                      }`}
                      title="Delete"
                    >
                      {deletingId === loom.id ? (
                        <SpinnerSvg />
                      ) : (
                        <TrashIcon className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded chapters */}
                {isExpanded && chapters.length > 0 && (
                  <div className="ml-[52px] mr-4 mb-2 mt-1">
                    <div className="border border-[#f0f0f0] rounded-lg overflow-hidden">
                      {chapters.map(
                        (chapter: BookChapter, chapterIndex: number) => (
                          <div
                            key={chapter.id}
                            onClick={(e) =>
                              handleChapterClick(e, chapter.startPage)
                            }
                            style={{ animationDelay: `${chapterIndex * 30}ms` }}
                            className="flex items-start gap-3 px-3 py-2.5 cursor-pointer hover:bg-[#fafafa] transition-colors border-b border-[#f0f0f0] last:border-b-0 active:scale-[0.99] [animation:dashboard-card-enter_0.2s_ease-out_both]"
                          >
                            {/* Chapter number */}
                            <span className="flex-shrink-0 w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center text-[11px] font-semibold text-[#737373] mt-0.5">
                              {chapterIndex + 1}
                            </span>

                            {/* Chapter info */}
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-semibold text-gray-900 truncate leading-tight">
                                {chapter.title}
                              </p>
                              {chapter.description && (
                                <p className="text-[12px] text-[#999999] truncate leading-tight mt-0.5">
                                  {chapter.description}
                                </p>
                              )}
                            </div>

                            {/* Page number */}
                            {chapter.startPage && (
                              <span className="flex-shrink-0 text-[11px] text-[#999999] mt-0.5">
                                p.{chapter.startPage}
                              </span>
                            )}

                            {/* Sub-chapter count */}
                            {chapter.subChapters &&
                              chapter.subChapters.length > 0 && (
                                <span className="flex-shrink-0 text-[11px] text-[#999999] mt-0.5">
                                  {chapter.subChapters.length}{" "}
                                  {chapter.subChapters.length === 1
                                    ? "section"
                                    : "sections"}
                                </span>
                              )}
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}

                {/* Expanded but no chapters */}
                {isExpanded && chapters.length === 0 && (
                  <div className="ml-[52px] mr-4 mb-2 mt-1">
                    <div className="border border-[#f0f0f0] rounded-lg px-3 py-3 text-center">
                      <p className="text-xs text-[#999999]">
                        No chapters available
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
