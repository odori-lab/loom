import { useCallback, useState } from "react";

/**
 * Coordinates navigation between HtmlSpreadViewer and TocPanel.
 *
 * Returns the glue props that both components need:
 *  - `visiblePages`       → pass to TocPanel
 *  - `handleNavigateReady` → pass to HtmlSpreadViewer.onNavigateReady
 *  - `handleSpreadChange`  → pass to HtmlSpreadViewer.onSpreadChange
 *  - `handleTocNavigate`   → pass to TocPanel.onNavigate
 */
export function useSpreadTocSync() {
  const [navigateFn, setNavigateFn] = useState<
    ((pageNum: number) => void) | null
  >(null);
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set());

  const handleNavigateReady = useCallback(
    (fn: (pageNum: number) => void) => {
      setNavigateFn(() => fn);
    },
    [],
  );

  const handleSpreadChange = useCallback(
    (left: number | null, right: number | null) => {
      const set = new Set<number>();
      if (left !== null) set.add(left);
      if (right !== null) set.add(right);
      setVisiblePages(set);
    },
    [],
  );

  const handleTocNavigate = useCallback(
    (pageNum: number) => {
      navigateFn?.(pageNum);
    },
    [navigateFn],
  );

  return {
    visiblePages,
    handleNavigateReady,
    handleSpreadChange,
    handleTocNavigate,
  } as const;
}
