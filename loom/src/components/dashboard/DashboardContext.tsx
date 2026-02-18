"use client";

import type { Database, StoredPage } from "@loom/shared";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useMemo,
  useState,
} from "react";
import { fetchStoredPages } from "@/lib/api/storage";

type Loom = Database["public"]["Tables"]["looms"]["Row"];
type DashboardTab = "looms" | "create" | "setting";

interface DashboardContextValue {
  activeTab: DashboardTab;
  looms: Loom[];
  selectedLoom: Loom | null;
  previewUrl: string | null;
  previewPages: StoredPage[] | null;
  loadingPreview: boolean;
  previewModalOpen: boolean;
  deletingId: string | null;
  initialPage: number | null;
  setActiveTab: (tab: DashboardTab) => void;
  selectLoom: (loom: Loom) => void;
  deleteLoom: (id: string) => void;
  openPreviewModal: (page?: number) => void;
  openPreviewModalWithPages: (pages: StoredPage[]) => void;
  closePreviewModal: () => void;
  addLoom: (loom: Loom) => void;
}

const DashboardContext = createContext<DashboardContextValue | undefined>(
  undefined,
);

export function useDashboard(): DashboardContextValue {
  const context = use(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
}

interface DashboardProviderProps {
  initialLooms: Loom[];
  children: ReactNode;
}

export function DashboardProvider({
  initialLooms,
  children,
}: DashboardProviderProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const initialTab: DashboardTab =
    tabParam === "create"
      ? "create"
      : tabParam === "setting"
        ? "setting"
        : "looms";

  const [activeTab, setActiveTabState] = useState<DashboardTab>(initialTab);
  const [looms, setLooms] = useState(initialLooms);
  const [selectedLoom, setSelectedLoom] = useState<Loom | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewPages, setPreviewPages] = useState<StoredPage[] | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [initialPage, setInitialPage] = useState<number | null>(null);

  const setActiveTab = useCallback(
    (tab: DashboardTab) => {
      setActiveTabState(tab);
      const url = tab === "looms" ? "/dashboard" : `/dashboard?tab=${tab}`;
      router.replace(url, { scroll: false });
    },
    [router],
  );

  const selectLoom = useCallback(async (loom: Loom) => {
    setSelectedLoom(loom);
    setLoadingPreview(true);
    setPreviewUrl(null);
    setPreviewPages(null);

    try {
      const res = await fetch(`/api/looms/${loom.id}`);
      const data = await res.json();
      if (data.downloadUrl) {
        setPreviewUrl(data.downloadUrl);
      }
      if (data.pagesUrl) {
        try {
          const pages = await fetchStoredPages(data.pagesUrl);
          setPreviewPages(pages);
        } catch (e) {
          console.error("Failed to load stored pages:", e);
        }
      }
    } catch (error) {
      console.error("Failed to load preview:", error);
    } finally {
      setLoadingPreview(false);
    }
  }, []);

  const deleteLoom = useCallback(async (id: string) => {
    if (!confirm("Are you sure you want to delete this Loom?")) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/looms/${id}`, { method: "DELETE" });
      if (res.ok) {
        setLooms((prev) => prev.filter((loom) => loom.id !== id));
        setSelectedLoom((prev) => {
          if (prev?.id === id) {
            setPreviewUrl(null);
            setPreviewPages(null);
            return null;
          }
          return prev;
        });
      }
    } catch (error) {
      console.error("Delete failed:", error);
    } finally {
      setDeletingId(null);
    }
  }, []);

  const openPreviewModal = useCallback((page?: number) => {
    setInitialPage(page ?? null);
    setPreviewModalOpen(true);
  }, []);
  const openPreviewModalWithPages = useCallback((pages: StoredPage[]) => {
    setPreviewPages(pages);
    setInitialPage(null);
    setPreviewModalOpen(true);
  }, []);
  const closePreviewModal = useCallback(() => {
    setPreviewModalOpen(false);
    setInitialPage(null);
  }, []);

  const addLoom = useCallback((loom: Loom) => {
    setLooms((prev) => [loom, ...prev]);
  }, []);

  const value = useMemo(
    () => ({
      activeTab,
      looms,
      selectedLoom,
      previewUrl,
      previewPages,
      loadingPreview,
      previewModalOpen,
      deletingId,
      initialPage,
      setActiveTab,
      selectLoom,
      deleteLoom,
      openPreviewModal,
      openPreviewModalWithPages,
      closePreviewModal,
      addLoom,
    }),
    [
      activeTab,
      looms,
      selectedLoom,
      previewUrl,
      previewPages,
      loadingPreview,
      previewModalOpen,
      deletingId,
      initialPage,
      setActiveTab,
      selectLoom,
      deleteLoom,
      openPreviewModal,
      openPreviewModalWithPages,
      closePreviewModal,
      addLoom,
    ],
  );

  return <DashboardContext value={value}>{children}</DashboardContext>;
}
