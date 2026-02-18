"use client";

import type { BookStructure, ThreadsPost, ThreadsProfile } from "@loom/shared";
import { useCallback, useState } from "react";

export function useBookOrganization(
  posts: ThreadsPost[],
  profile: ThreadsProfile | null,
  initialBookStructure?: BookStructure | null,
) {
  const [bookStructure, setBookStructure] = useState<BookStructure | null>(
    initialBookStructure ?? null,
  );
  const [organizing, setOrganizing] = useState(false);

  const organizeBook = useCallback(async (): Promise<BookStructure | null> => {
    if (!profile || posts.length === 0) return null;

    setOrganizing(true);
    try {
      const res = await fetch("/api/organize-book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posts, profile }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const result = data as BookStructure;
      setBookStructure(result);
      return result;
    } finally {
      setOrganizing(false);
    }
  }, [posts, profile]);

  const regenerateStructure = useCallback(() => {
    setBookStructure(null);
  }, []);

  return {
    bookStructure,
    setBookStructure,
    organizing,
    organizeBook,
    regenerateStructure,
  };
}
