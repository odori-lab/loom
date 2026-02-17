import { ContentBlock, MeasuredBlock } from "./types";
import {
  PAGE_WIDTH,
  PAGE_HEIGHT,
  IMAGE_LOAD_TIMEOUT,
  IMAGE_FALLBACK_HEIGHTS,
  DEFAULT_IMAGE_FALLBACK,
} from "./constants";
import { PDF_STYLES } from "./templates/styles";

// Re-export types and functions for backward compatibility
export type { MeasuredBlock, PageMapping } from "./types";
export { MAX_PAGE_HEIGHT } from "./constants";
export { splitOversizedBlocks } from "./splitting";
export { assignBlocksToPages, buildPageMapping, pagesToHtml } from "./packing";

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

// Measure actual rendered heights of content blocks using a hidden iframe
// Returns { measured, iframe } to allow iframe reuse for splitting
export async function measureBlockHeights(
  blocks: ContentBlock[],
): Promise<{ measured: MeasuredBlock[]; iframe: HTMLIFrameElement }> {
  const iframe = document.createElement("iframe");
  iframe.style.cssText = `position: fixed; left: -9999px; top: 0; width: ${PAGE_WIDTH}px; height: ${PAGE_HEIGHT}px; visibility: hidden; pointer-events: none; border: none;`;
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    throw new Error("Cannot access iframe document");
  }

  // Set up the iframe document with PDF styles
  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>${PDF_STYLES}</style>
        <style>
          body { margin: 0; padding: 0; }
          .measure-container {
            width: 148mm;
            padding: 0 20mm;
          }
          .measure-block {
            width: 100%;
            overflow: hidden; /* BFC to capture child margins */
          }
        </style>
      </head>
      <body>
        <div class="measure-container" id="container"></div>
      </body>
    </html>
  `);
  iframeDoc.close();

  // Wait for fonts to be ready
  if (iframeDoc.fonts) {
    await iframeDoc.fonts.ready;
  }

  const container = iframeDoc.getElementById("container");
  if (!container) {
    document.body.removeChild(iframe);
    throw new Error("Cannot find measurement container");
  }

  const measuredBlocks: MeasuredBlock[] = [];

  for (const block of blocks) {
    // Measure ALL blocks including fullPage to detect overflow
    const wrapper = iframeDoc.createElement("div");
    wrapper.className = "measure-block";
    // Add dummy sibling to prevent :last-child from zeroing margins
    wrapper.innerHTML =
      block.html + '<div style="height:0;margin:0;padding:0;border:0;"></div>';
    container.appendChild(wrapper);

    await waitForImages(wrapper);

    const height = wrapper.getBoundingClientRect().height;
    measuredBlocks.push({
      ...block,
      measuredHeight: Math.ceil(height),
    });

    container.removeChild(wrapper);
  }

  return { measured: measuredBlocks, iframe };
}
