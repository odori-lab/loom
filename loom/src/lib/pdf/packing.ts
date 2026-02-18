import type { PageMeta, StoredPage } from "@loom/shared";
import { SAFE_PAGE_HEIGHT } from "./constants";
import type { ContentBlock, MeasuredBlock, PageMapping } from "./types";

// Page types that should NOT show page numbers
const NO_PAGE_NUMBER_TYPES: Set<ContentBlock["type"]> = new Set([
  "cover",
  "blank",
  "author",
  "last",
  "chapter-title",
]);

// Find the index of the preface page (or first content page after author) for display numbering.
// Display page number = absoluteIndex - prefaceIndex + 1, so preface = 1.
function findPrefaceIndex(pageAssignments: MeasuredBlock[][]): number {
  for (let i = 0; i < pageAssignments.length; i++) {
    if (pageAssignments[i][0]?.type === "preface") return i;
  }
  // Fallback: first page after author pages
  for (let i = 0; i < pageAssignments.length; i++) {
    const t = pageAssignments[i][0]?.type;
    if (t !== "cover" && t !== "blank" && t !== "author") return i;
  }
  return 0;
}

// Assign measured blocks to pages using first-fit bin packing
export function assignBlocksToPages(
  measuredBlocks: MeasuredBlock[],
): MeasuredBlock[][] {
  const pages: MeasuredBlock[][] = [];
  let currentPage: MeasuredBlock[] = [];
  let currentHeight = 0;

  for (const block of measuredBlocks) {
    if (block.fullPage) {
      // Full-page blocks get their own page
      if (currentPage.length > 0) {
        pages.push(currentPage);
        currentPage = [];
        currentHeight = 0;
      }
      pages.push([block]);
      continue;
    }

    // Sub-chapter always starts a new page
    if (block.type === "sub-chapter") {
      if (currentPage.length > 0) {
        pages.push(currentPage);
        currentPage = [];
        currentHeight = 0;
      }
    }

    // Check if block fits on current page (use SAFE height for margin)
    if (
      currentPage.length > 0 &&
      currentHeight + block.measuredHeight > SAFE_PAGE_HEIGHT
    ) {
      // Doesn't fit - start new page
      pages.push(currentPage);
      currentPage = [block];
      currentHeight = block.measuredHeight;
    } else {
      // Fits on current page
      currentPage.push(block);
      currentHeight += block.measuredHeight;
    }
  }

  // Push remaining blocks
  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  // Backfill pass: pull blocks from next page to fill remaining space
  for (let i = 0; i < pages.length - 1; i++) {
    const page = pages[i];
    // Skip fullPage pages (single block with fullPage flag)
    if (page.length === 1 && page[0].fullPage) continue;

    const pageHeight = page.reduce((sum, b) => sum + b.measuredHeight, 0);
    let remaining = SAFE_PAGE_HEIGHT - pageHeight;

    while (i + 1 < pages.length) {
      const nextPage = pages[i + 1];
      // Don't pull from fullPage pages
      if (nextPage.length === 1 && nextPage[0].fullPage) break;
      if (nextPage.length === 0) {
        pages.splice(i + 1, 1);
        continue;
      }

      const firstBlock = nextPage[0];
      if (firstBlock.fullPage) break; // Don't pull fullPage blocks
      if (firstBlock.type === "sub-chapter") break; // Sub-chapters must start on their own page
      if (firstBlock.measuredHeight > remaining) break; // Doesn't fit

      // Move block from next page to current page
      page.push(nextPage.shift()!);
      remaining -= firstBlock.measuredHeight;

      // If next page is now empty, remove it
      if (nextPage.length === 0) {
        pages.splice(i + 1, 1);
      }
    }
  }

  // Orphan fix: post-header should not be the last block on a page
  for (let i = 0; i < pages.length - 1; i++) {
    const page = pages[i];
    if (page.length < 2) continue;
    const lastBlock = page[page.length - 1];
    if (lastBlock.id.startsWith("post-header-")) {
      page.pop();
      pages[i + 1].unshift(lastBlock);
    }
  }

  return pages;
}

// Build a mapping from block IDs to display page numbers.
// Display numbering starts from preface = 1.
export function buildPageMapping(
  pageAssignments: MeasuredBlock[][],
): PageMapping {
  const prefaceIdx = findPrefaceIndex(pageAssignments);
  const mapping: PageMapping = new Map();
  for (let pageIdx = 0; pageIdx < pageAssignments.length; pageIdx++) {
    const displayNum = pageIdx - prefaceIdx + 1;
    for (const block of pageAssignments[pageIdx]) {
      mapping.set(block.id, displayNum);
    }
  }
  return mapping;
}

// Convert page assignments to HTML strings
export function pagesToHtml(pageAssignments: MeasuredBlock[][]): string[] {
  const htmlPages: string[] = [];
  const prefaceIdx = findPrefaceIndex(pageAssignments);

  for (let i = 0; i < pageAssignments.length; i++) {
    const page = pageAssignments[i];
    const displayNum = i - prefaceIdx + 1;

    // Determine if this page should show a page number
    const firstBlock = page[0];
    const showPageNumber =
      firstBlock && !NO_PAGE_NUMBER_TYPES.has(firstBlock.type);
    const pageNumberHtml = showPageNumber
      ? `<div class="page-number">${displayNum}</div>`
      : "";

    if (page.length === 1 && page[0].fullPage) {
      // Full-page block: use its HTML directly (already wrapped in page div)
      // Inject page number before closing </div>
      let html = page[0].html;
      if (showPageNumber) {
        html = html.replace(/<\/div>\s*$/, `${pageNumberHtml}</div>`);
      }
      htmlPages.push(html);
    } else {
      // Content page with multiple blocks: wrap in page div
      const innerHtml = page.map((block) => block.html).join("\n");
      // Add spacer for TOC continuation pages (toc-part2, toc-part3, etc.)
      const hasTocContinuation = page.some((block) => {
        const match = block.id.match(/^toc-part(\d+)$/);
        return match && parseInt(match[1], 10) > 1;
      });
      const spacerHtml = hasTocContinuation
        ? '<div class="toc-continuation-spacer"></div>\n'
        : "";
      htmlPages.push(
        `<div class="page">\n${spacerHtml}${innerHtml}\n${pageNumberHtml}\n</div>`,
      );
    }
  }

  // Ensure last page ends on even absolute position.
  // Pop the last page, check remaining count, insert blanks as needed.
  const lastPage = htmlPages.pop()!;
  const remaining = htmlPages.length; // absolute count of pages before last
  if (remaining % 2 === 0) {
    // remaining is even → last would be at odd position → add one blank
    htmlPages.push('<div class="page"></div>');
  } else {
    // remaining is odd → last would be at even position → add blank-with-number + blank
    const blankDisplayNum = remaining - prefaceIdx + 1;
    htmlPages.push(
      `<div class="page"><div class="page-number">${blankDisplayNum}</div></div>`,
    );
    htmlPages.push('<div class="page"></div>');
  }
  htmlPages.push(lastPage);

  return htmlPages;
}

// Build PageMeta from a page's blocks
function buildPageMeta(page: MeasuredBlock[]): PageMeta {
  const firstBlock = page[0];
  const meta: PageMeta = { type: firstBlock.type };

  // Find chapter/sub-chapter info from any block on this page
  for (const block of page) {
    if (block.chapterIndex !== undefined) {
      meta.chapterIndex = block.chapterIndex;
      meta.chapterTitle = block.chapterTitle;
      if (block.subChapterIndex !== undefined) {
        meta.subChapterIndex = block.subChapterIndex;
        meta.subChapterTitle = block.subChapterTitle;
      }
      break;
    }
  }

  return meta;
}

// Build per-block PageMeta array for all blocks on a page
function buildBlockMetas(page: MeasuredBlock[]): PageMeta[] {
  return page.map((block) => {
    const meta: PageMeta = { type: block.type };
    if (block.chapterIndex !== undefined) {
      meta.chapterIndex = block.chapterIndex;
      meta.chapterTitle = block.chapterTitle;
    }
    if (block.subChapterIndex !== undefined) {
      meta.subChapterIndex = block.subChapterIndex;
      meta.subChapterTitle = block.subChapterTitle;
    }
    return meta;
  });
}

// Convert page assignments to StoredPage[] with metadata
export function pagesToStoredPages(
  pageAssignments: MeasuredBlock[][],
): StoredPage[] {
  const storedPages: StoredPage[] = [];
  const prefaceIdx = findPrefaceIndex(pageAssignments);

  for (let i = 0; i < pageAssignments.length; i++) {
    const page = pageAssignments[i];
    const displayNum = i - prefaceIdx + 1;

    // Determine if this page should show a page number
    const firstBlock = page[0];
    const showPageNumber =
      firstBlock && !NO_PAGE_NUMBER_TYPES.has(firstBlock.type);
    const pageNumberHtml = showPageNumber
      ? `<div class="page-number">${displayNum}</div>`
      : "";

    const meta = buildPageMeta(page);
    const blockMetas = buildBlockMetas(page);

    if (page.length === 1 && page[0].fullPage) {
      let html = page[0].html;
      if (showPageNumber) {
        html = html.replace(/<\/div>\s*$/, `${pageNumberHtml}</div>`);
      }
      storedPages.push({ html, meta, blockMetas });
    } else {
      const innerHtml = page.map((block) => block.html).join("\n");
      // Add spacer for TOC continuation pages (toc-part2, toc-part3, etc.)
      const hasTocContinuation = page.some((block) => {
        const match = block.id.match(/^toc-part(\d+)$/);
        return match && parseInt(match[1], 10) > 1;
      });
      const spacerHtml = hasTocContinuation
        ? '<div class="toc-continuation-spacer"></div>\n'
        : "";
      const html = `<div class="page">\n${spacerHtml}${innerHtml}\n${pageNumberHtml}\n</div>`;
      storedPages.push({ html, meta, blockMetas });
    }
  }

  // Ensure last page ends on even absolute position.
  const lastPage = storedPages.pop()!;
  const remaining = storedPages.length;
  if (remaining % 2 === 0) {
    // remaining is even → last would be at odd position → add one blank
    storedPages.push({
      html: '<div class="page"></div>',
      meta: { type: "blank" },
    });
  } else {
    // remaining is odd → last would be at even position → add blank-with-number + blank
    const blankDisplayNum = remaining - prefaceIdx + 1;
    storedPages.push({
      html: `<div class="page"><div class="page-number">${blankDisplayNum}</div></div>`,
      meta: { type: "blank" },
    });
    storedPages.push({
      html: '<div class="page"></div>',
      meta: { type: "blank" },
    });
  }
  storedPages.push(lastPage);

  return storedPages;
}
