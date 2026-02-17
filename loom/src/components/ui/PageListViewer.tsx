"use client";

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { generatePageHtml } from "@/lib/pdf/generator";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
  /** PDF mode: provide a URL to a PDF file */
  pdfUrl?: string;
  /** HTML mode: provide an array of page HTML strings */
  htmlPages?: string[];
  /** Available panel width */
  width?: number;
  /** Click handler for individual pages */
  onPageClick?: (pageNumber: number) => void;
}

export function PageListViewer({
  pdfUrl,
  htmlPages,
  width = 500,
  onPageClick,
}: PageListViewerProps) {
  const pageDisplayWidth = Math.min(width - 48, 500); // padding on both sides, max 500px
  const scale = pageDisplayWidth / SOURCE_WIDTH;
  const pageDisplayHeight = Math.round(SOURCE_HEIGHT * scale);

  if (pdfUrl) {
    return (
      <PdfMode
        url={pdfUrl}
        pageWidth={pageDisplayWidth}
        onPageClick={onPageClick}
      />
    );
  }

  if (htmlPages) {
    return (
      <HtmlMode
        pages={htmlPages}
        pageWidth={pageDisplayWidth}
        pageHeight={pageDisplayHeight}
        scale={scale}
        onPageClick={onPageClick}
      />
    );
  }

  return null;
}

function PdfMode({
  url,
  pageWidth,
  onPageClick,
}: {
  url: string;
  pageWidth: number;
  onPageClick?: (pageNumber: number) => void;
}) {
  const [numPages, setNumPages] = useState<number | null>(null);

  return (
    <div className="h-full overflow-y-auto snap-y snap-mandatory">
      <div className="h-[40vh]" />
      <Document
        file={url}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        loading={
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-gray-900 animate-spin" />
          </div>
        }
        error={
          <div className="text-center py-20">
            <p className="text-gray-500">Failed to load PDF</p>
          </div>
        }
      >
        {numPages &&
          Array.from({ length: numPages }, (_, i) => (
            <div
              key={i}
              className={`mb-6 flex justify-center snap-center${onPageClick ? " cursor-pointer" : ""}`}
              onClick={onPageClick ? () => onPageClick(i + 1) : undefined}
            >
              <div className="shadow-sm rounded-lg overflow-hidden">
                <Page
                  pageNumber={i + 1}
                  width={pageWidth}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                />
              </div>
            </div>
          ))}
      </Document>
      <div className="h-[40vh]" />
    </div>
  );
}

function HtmlMode({
  pages,
  pageWidth,
  pageHeight,
  scale,
  onPageClick,
}: {
  pages: string[];
  pageWidth: number;
  pageHeight: number;
  scale: number;
  onPageClick?: (pageNumber: number) => void;
}) {
  return (
    <div className="h-full overflow-y-auto snap-y snap-mandatory">
      <div className="h-[40vh]" />
      {pages.map((html, i) => (
        <div
          key={i}
          className={`mb-6 flex justify-center snap-center${onPageClick ? " cursor-pointer" : ""}`}
          onClick={onPageClick ? () => onPageClick(i + 1) : undefined}
        >
          <div
            className="shadow-sm rounded-lg overflow-hidden bg-white"
            style={{ width: pageWidth, height: pageHeight }}
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
