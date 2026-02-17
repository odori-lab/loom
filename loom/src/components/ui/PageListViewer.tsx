"use client";

import { generatePageHtml } from "@/lib/pdf/generator";

// Source page dimensions (A5 at 96dpi)
const SOURCE_WIDTH = 559;
const SOURCE_HEIGHT = 793;

function proxyImageUrls(html: string): string {
  return html.replace(
    /(<img\s[^>]*src=")([^"]+cdninstagram\.com[^"]+)(")/g,
    (_match, before, url, after) =>
      `${before}/api/proxy-image?url=${encodeURIComponent(url)}${after}`,
  );
}

interface PageListViewerProps {
  /** Array of page HTML strings */
  pages: string[];
  /** Available panel width */
  width?: number;
  /** Click handler for individual pages */
  onPageClick?: (pageNumber: number) => void;
}

export function PageListViewer({
  pages,
  width = 500,
  onPageClick,
}: PageListViewerProps) {
  const pageDisplayWidth = Math.min(width - 48, 500); // padding on both sides, max 500px
  const scale = pageDisplayWidth / SOURCE_WIDTH;
  const pageDisplayHeight = Math.round(SOURCE_HEIGHT * scale);

  if (pages.length === 0) return null;

  return (
    <div className="h-full overflow-y-auto snap-y snap-mandatory">
      <div className="h-[40vh]" />
      {pages.map((html, i) => (
        <div
          key={i}
          className={`mb-6 flex justify-center snap-center ${onPageClick ? "cursor-pointer" : ""}`}
          onClick={onPageClick ? () => onPageClick(i + 1) : undefined}
        >
          <div
            className="shadow-sm rounded-lg overflow-hidden bg-white"
            style={{ width: pageDisplayWidth, height: pageDisplayHeight }}
          >
            <iframe
              srcDoc={generatePageHtml(proxyImageUrls(html))}
              className="bg-white pointer-events-none"
              scrolling="no"
              style={{
                width: `${SOURCE_WIDTH}px`,
                height: `${SOURCE_HEIGHT}px`,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                border: "none",
                overflow: "hidden",
              }}
              title={`Page ${i + 1}`}
            />
          </div>
        </div>
      ))}
      <div className="h-[40vh]" />
    </div>
  );
}
