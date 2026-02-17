import { ContentBlock, MeasuredBlock, PageMapping } from "./types";
import { StoredPage, PageMeta } from "@loom/shared";
import { SAFE_PAGE_HEIGHT } from "./constants";

// Page types that should NOT show page numbers
const NO_PAGE_NUMBER_TYPES: Set<ContentBlock["type"]> = new Set([
  "cover",
  "blank",
  "last",
  "chapter-title",
]);

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

  // Sub-chapter title stickiness: prevent orphaned sub-chapter headers
  for (let i = 0; i < pages.length - 1; i++) {
    const page = pages[i];
    if (page.length === 0) continue;

    const lastBlock = page[page.length - 1];
    if (lastBlock.type === "sub-chapter") {
      const nextPage = pages[i + 1];
      const nextPageHeight = nextPage.reduce(
        (sum, b) => sum + b.measuredHeight,
        0,
      );
      if (nextPageHeight + lastBlock.measuredHeight <= SAFE_PAGE_HEIGHT) {
        // Safe to move - combined height fits
        page.pop();
        nextPage.unshift(lastBlock);
      } else {
        // Moving would overflow next page - give sub-chapter its own page
        page.pop();
        pages.splice(i + 1, 0, [lastBlock]);
        i++; // Skip the newly inserted page to avoid infinite loop
      }
    }
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

  return pages;
}

// Build a mapping from block IDs to 1-based page numbers
export function buildPageMapping(
  pageAssignments: MeasuredBlock[][],
): PageMapping {
  const mapping: PageMapping = new Map();
  for (let pageIdx = 0; pageIdx < pageAssignments.length; pageIdx++) {
    const pageNum = pageIdx + 1; // 1-based
    for (const block of pageAssignments[pageIdx]) {
      mapping.set(block.id, pageNum);
    }
  }
  return mapping;
}

// Convert page assignments to HTML strings
export function pagesToHtml(pageAssignments: MeasuredBlock[][]): string[] {
  const htmlPages: string[] = [];

  // Track content pages (non-cover, non-last) for blank page logic
  let contentPageCount = 0;

  for (let i = 0; i < pageAssignments.length; i++) {
    const page = pageAssignments[i];
    const pageNum = i + 1; // 1-based page number

    // Determine if this page should show a page number
    const firstBlock = page[0];
    const showPageNumber =
      firstBlock && !NO_PAGE_NUMBER_TYPES.has(firstBlock.type);
    const pageNumberHtml = showPageNumber
      ? `<div class="page-number">${pageNum}</div>`
      : "";

    if (page.length === 1 && page[0].fullPage) {
      // Full-page block: use its HTML directly (already wrapped in page div)
      // Inject page number before closing </div>
      let html = page[0].html;
      if (showPageNumber) {
        html = html.replace(/<\/div>\s*$/, `${pageNumberHtml}</div>`);
      }
      htmlPages.push(html);

      // Count content pages (not cover, last, or blank)
      if (
        page[0].type !== "cover" &&
        page[0].type !== "last" &&
        page[0].type !== "blank"
      ) {
        contentPageCount++;
      }
    } else {
      // Content page with multiple blocks: wrap in page div
      const innerHtml = page.map((block) => block.html).join("\n");
      htmlPages.push(
        `<div class="page">\n${innerHtml}\n${pageNumberHtml}\n</div>`,
      );
      contentPageCount++;
    }
  }

  // Add blank page before last page if content pages are odd
  if (contentPageCount % 2 === 1) {
    // Insert blank page before the last page
    const lastPage = htmlPages.pop()!;
    htmlPages.push('<div class="page"></div>');
    htmlPages.push(lastPage);
  }

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

// Convert page assignments to StoredPage[] with metadata
export function pagesToStoredPages(
  pageAssignments: MeasuredBlock[][],
): StoredPage[] {
  const storedPages: StoredPage[] = [];

  // Track content pages (non-cover, non-last) for blank page logic
  let contentPageCount = 0;

  for (let i = 0; i < pageAssignments.length; i++) {
    const page = pageAssignments[i];
    const pageNum = i + 1; // 1-based page number

    // Determine if this page should show a page number
    const firstBlock = page[0];
    const showPageNumber =
      firstBlock && !NO_PAGE_NUMBER_TYPES.has(firstBlock.type);
    const pageNumberHtml = showPageNumber
      ? `<div class="page-number">${pageNum}</div>`
      : "";

    const meta = buildPageMeta(page);

    if (page.length === 1 && page[0].fullPage) {
      let html = page[0].html;
      if (showPageNumber) {
        html = html.replace(/<\/div>\s*$/, `${pageNumberHtml}</div>`);
      }
      storedPages.push({ html, meta });

      if (
        page[0].type !== "cover" &&
        page[0].type !== "last" &&
        page[0].type !== "blank"
      ) {
        contentPageCount++;
      }
    } else {
      const innerHtml = page.map((block) => block.html).join("\n");
      const html = `<div class="page">\n${innerHtml}\n${pageNumberHtml}\n</div>`;
      storedPages.push({ html, meta });
      contentPageCount++;
    }
  }

  // Add blank page before last page if content pages are odd
  if (contentPageCount % 2 === 1) {
    const lastPage = storedPages.pop()!;
    storedPages.push({
      html: '<div class="page"></div>',
      meta: { type: "blank" },
    });
    storedPages.push(lastPage);
  }

  return storedPages;
}
