'use client'

import { useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PdfPageViewerProps {
  url: string
  width?: number
  snapScroll?: boolean
  onPageClick?: (pageNumber: number) => void
}

export function PdfPageViewer({ url, width = 360, snapScroll = false, onPageClick }: PdfPageViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null)

  return (
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
      {numPages && (
        <>
          {snapScroll && <div className="h-[40vh]" />}
          {Array.from({ length: numPages }, (_, i) => {
            const page = (
              <Page
                pageNumber={i + 1}
                width={width}
                renderAnnotationLayer={false}
                renderTextLayer={false}
              />
            )

            return snapScroll ? (
              <div
                key={i}
                className={`mb-6 flex justify-center snap-center${onPageClick ? ' cursor-pointer' : ''}`}
                onClick={onPageClick ? () => onPageClick(i + 1) : undefined}
              >
                <div className="shadow-sm rounded-lg overflow-hidden">{page}</div>
              </div>
            ) : (
              <div
                key={i}
                className={`mb-4 shadow-sm rounded-lg overflow-hidden${onPageClick ? ' cursor-pointer' : ''}`}
                onClick={onPageClick ? () => onPageClick(i + 1) : undefined}
              >
                {page}
              </div>
            )
          })}
          {snapScroll && <div className="h-[40vh]" />}
        </>
      )}
    </Document>
  )
}
