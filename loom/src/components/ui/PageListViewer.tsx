"use client";

import { PAGE_WIDTH, PAGE_HEIGHT } from "@/lib/pdf/constants";
import { generatePageHtml } from "@/lib/pdf/generator";
import { proxyImageUrls } from "@/lib/proxy";

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
  const scale = pageDisplayWidth / PAGE_WIDTH;
  const pageDisplayHeight = Math.round(PAGE_HEIGHT * scale);

  if (pages.length === 0) return null;

  return (
    <div className="h-full overflow-y-auto snap-y snap-mandatory scrollbar-stable">
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
                width: `${PAGE_WIDTH}px`,
                height: `${PAGE_HEIGHT}px`,
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
