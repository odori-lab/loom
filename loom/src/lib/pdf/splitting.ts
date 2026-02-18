import {
  DEFAULT_IMAGE_FALLBACK,
  IMAGE_FALLBACK_HEIGHTS,
  IMAGE_LOAD_TIMEOUT,
  SAFE_PAGE_HEIGHT,
} from "./constants";
import type { ContentBlock, MeasuredBlock } from "./types";

// Block types that should NEVER be split - they are designed as single full page
const NO_SPLIT_TYPES: Set<ContentBlock["type"]> = new Set([
  "cover",
  "author",
  "preface",
  "chapter-title",
  "last",
  "blank",
]);

// Wait for all images in an element to load (with timeout), then apply
// fallback dimensions for any images that failed to load
async function waitForImages(element: HTMLElement): Promise<void> {
  const images = Array.from(element.querySelectorAll("img"));
  if (images.length === 0) return;

  await Promise.all(
    images.map((img) => {
      if (img.complete && img.naturalHeight !== 0) {
        return Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        const timer = setTimeout(() => resolve(), IMAGE_LOAD_TIMEOUT);
        img.onload = () => {
          clearTimeout(timer);
          resolve();
        };
        img.onerror = () => {
          clearTimeout(timer);
          resolve();
        };
      });
    }),
  );

  // For images that failed to load, set explicit fallback dimensions
  // so measurement reserves space for them (prevents underestimation)
  for (const img of images) {
    if (img.naturalHeight === 0 || !img.complete) {
      const fallback =
        IMAGE_FALLBACK_HEIGHTS[img.className] ?? DEFAULT_IMAGE_FALLBACK;
      img.style.height = `${fallback}px`;
      img.style.display = "block";
    }
  }
}

// Split oversized blocks into multiple page-sized chunks
// Only splits: toc, post, sub-chapter
export async function splitOversizedBlocks(
  measuredBlocks: MeasuredBlock[],
  iframe: HTMLIFrameElement,
): Promise<MeasuredBlock[]> {
  const result: MeasuredBlock[] = [];

  for (const block of measuredBlocks) {
    // Never split cover, preface, chapter-title, last, blank
    if (NO_SPLIT_TYPES.has(block.type)) {
      result.push(block);
      continue;
    }

    if (block.measuredHeight <= SAFE_PAGE_HEIGHT) {
      result.push(block);
      continue;
    }

    const splitBlocks = await splitBlock(block, iframe);
    result.push(...splitBlocks);
  }

  return result;
}

// Recursively collect splittable leaf children from an element tree
// Always descends into children that have sub-children for finest granularity
export function collectLeaves(
  element: HTMLElement,
  maxHeight: number,
): { html: string; height: number }[] {
  const children = Array.from(element.children) as HTMLElement[];
  if (children.length === 0) {
    return [
      {
        html: element.outerHTML,
        height: Math.ceil(element.getBoundingClientRect().height),
      },
    ];
  }

  const result: { html: string; height: number }[] = [];
  for (const child of children) {
    const h = Math.ceil(child.getBoundingClientRect().height);
    if (h > maxHeight && child.children.length > 0) {
      result.push(...collectLeaves(child, maxHeight));
    } else {
      result.push({ html: child.outerHTML, height: h });
    }
  }

  return result;
}

// Refine oversized text leaves by splitting at newline boundaries
export function refineOversizedLeaves(
  leaves: { html: string; height: number }[],
  maxHeight: number,
  iframeDoc: Document,
  container: HTMLElement,
): { html: string; height: number }[] {
  const result: typeof leaves = [];

  for (const leaf of leaves) {
    if (leaf.height <= maxHeight) {
      result.push(leaf);
      continue;
    }

    // Try to split text content by newlines
    const temp = iframeDoc.createElement("div");
    temp.innerHTML = leaf.html;
    const el = temp.firstElementChild as HTMLElement;
    if (!el) {
      result.push(leaf);
      continue;
    }

    const text = el.textContent || "";
    const lines = text.split("\n").filter((l) => l.trim());

    if (lines.length <= 1) {
      // Can't split further - single long line
      result.push(leaf);
      continue;
    }

    // Measure each line individually
    const className = el.className;
    for (const line of lines) {
      const lineEl = iframeDoc.createElement("div");
      lineEl.className = className;
      lineEl.textContent = line;
      container.appendChild(lineEl);
      const h = Math.ceil(lineEl.getBoundingClientRect().height);
      result.push({ html: lineEl.outerHTML, height: h });
      container.removeChild(lineEl);
    }
  }

  return result;
}

// Split a single oversized block into multiple page-sized blocks
async function splitBlock(
  block: MeasuredBlock,
  iframe: HTMLIFrameElement,
): Promise<MeasuredBlock[]> {
  const iframeDoc = iframe.contentDocument;
  if (!iframeDoc) return [block];

  const container = iframeDoc.getElementById("container");
  if (!container) return [block];

  const wrapper = iframeDoc.createElement("div");
  wrapper.className = "measure-block";
  wrapper.innerHTML = block.html;
  container.appendChild(wrapper);

  try {
    await waitForImages(wrapper);

    const rootEl = wrapper.firstElementChild as HTMLElement;
    if (!rootEl) return [block];

    const splitThreshold = SAFE_PAGE_HEIGHT;

    // Recursively collect leaf elements that are small enough to fit
    const leaves = collectLeaves(rootEl, splitThreshold);

    // Refine: split oversized text leaves by newline boundaries
    const refined = refineOversizedLeaves(
      leaves,
      splitThreshold,
      iframeDoc,
      container,
    );

    if (refined.length <= 1) return [block];

    // Bin-pack refined leaves into page-sized groups
    // Use actual DOM measurement for each group to account for CSS gaps/margins
    const rootClassName = rootEl.className;
    const groups: { html: string; height: number }[][] = [];
    let currentGroup: (typeof groups)[0] = [];

    // Helper: measure actual rendered height of a group
    const measureGroup = (group: (typeof groups)[0]): number => {
      const groupHtml = `<div class="${rootClassName}">${group.map((c) => c.html).join("\n")}</div>`;
      const testWrapper = iframeDoc.createElement("div");
      testWrapper.className = "measure-block";
      testWrapper.innerHTML = `${groupHtml}<div style="height:0;margin:0;padding:0;border:0;"></div>`;
      container.appendChild(testWrapper);
      const h = Math.ceil(testWrapper.getBoundingClientRect().height);
      container.removeChild(testWrapper);
      return h;
    };

    for (const leaf of refined) {
      if (leaf.height > splitThreshold) {
        // Leaf too large to fit - give it its own page
        if (currentGroup.length > 0) {
          groups.push(currentGroup);
          currentGroup = [];
        }
        groups.push([leaf]);
        continue;
      }

      // Try adding this leaf and measure actual rendered height
      const testGroup = [...currentGroup, leaf];
      const actualHeight = measureGroup(testGroup);

      if (currentGroup.length > 0 && actualHeight > splitThreshold) {
        // Doesn't fit - start new group
        groups.push(currentGroup);
        currentGroup = [leaf];
      } else {
        currentGroup = testGroup;
      }
    }

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    if (groups.length <= 1) return [block];

    // Convert groups to MeasuredBlocks with actual measured heights
    return groups.map((group, i) => ({
      ...block,
      id: `${block.id}-part${i + 1}`,
      html: `<div class="${rootClassName}">${group.map((c) => c.html).join("\n")}</div>`,
      measuredHeight: measureGroup(group),
    }));
  } finally {
    container.removeChild(wrapper);
  }
}
