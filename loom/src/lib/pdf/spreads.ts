import { StoredPage } from "@loom/shared";
import {
  calculateSpreads as calculateSpreadsFromStrings,
} from "@loom/shared";

// Re-export types
export type { SpreadData } from "@loom/shared";

// Adapter: converts StoredPage[] to string[] for shared calculateSpreads
export function calculateSpreads(pages: StoredPage[]) {
  return calculateSpreadsFromStrings(pages.map((p) => p.html));
}
