"use client";

import type {
  BookStructure,
  StoredPage,
  ThreadsPost,
  ThreadsProfile,
} from "@loom/shared";
import { createContext, use } from "react";
import type { SpreadData } from "@/lib/pdf/spreads";
import type { PageMapping } from "@/lib/pdf/types";

export type Step = "username" | "organize" | "complete";
export type SortOrder = "newest" | "oldest";
export type LoadingPhase = "idle" | "scraping" | "organizing";

export interface CreateFlowState {
  step: Step;
  posts: ThreadsPost[];
  profile: ThreadsProfile | null;
  downloadUrl: string;
  loading: boolean;
  loadingMore: boolean;
  loadingPhase: LoadingPhase;
  workerProgress: number;
  workerMessage: string;
  error: string;
  selectedIds: Set<string>;
  sortOrder: SortOrder;
  searchQuery: string;
  currentSpread: number;
  hasMore: boolean;
  bookStructure: BookStructure | null;
  organizing: boolean;
  measuring: boolean;
  spreadTarget: number | null;
}

export interface CreateFlowActions {
  submitUsername: (username: string) => void;
  generateLoom: () => void;
  createAnother: () => void;
  togglePost: (id: string) => void;
  toggleAll: () => void;
  setSortOrder: (order: SortOrder) => void;
  setSearchQuery: (query: string) => void;
  prevSpread: () => void;
  nextSpread: () => void;
  goBack: () => void;
  loadMorePosts: () => void;
  organizeBook: () => void;
  regenerateStructure: () => void;
  goToSpread: (spreadIdx: number | null) => void;
}

export interface CreateFlowMeta {
  steps: readonly Step[];
  currentStepIndex: number;
  filteredAndSortedPosts: ThreadsPost[];
  selectedPosts: ThreadsPost[];
  orderedPosts: ThreadsPost[];
  pages: StoredPage[];
  spreads: SpreadData[];
  currentSpreadData: SpreadData | undefined;
  selectedCount: number;
  totalSpreads: number;
  blockToSpread: Map<string, number>;
  pageMapping: PageMapping | null;
}

export interface CreateFlowContextValue {
  state: CreateFlowState;
  actions: CreateFlowActions;
  meta: CreateFlowMeta;
}

export const CreateFlowContext = createContext<
  CreateFlowContextValue | undefined
>(undefined);

export function useCreateFlow(): CreateFlowContextValue {
  const context = use(CreateFlowContext);
  if (!context) {
    throw new Error("useCreateFlow must be used within a CreateFlowProvider");
  }
  return context;
}
