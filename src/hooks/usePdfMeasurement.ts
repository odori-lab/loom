'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { ThreadsPost, ThreadsProfile } from '@/types/threads'
import { BookStructure } from '@/types/book'
import { generatePageContents } from '@/lib/pdf/generator'
import { generateContentBlocks } from '@/lib/pdf/content-blocks'
import { measureBlockHeights, MeasuredBlock, PageMapping } from '@/lib/pdf/measure'
import { splitOversizedBlocks } from '@/lib/pdf/measure'
import { assignBlocksToPages, buildPageMapping, pagesToHtml } from '@/lib/pdf/measure'
import { calculateSpreads } from '@/lib/pdf/spreads'
import { generateTocPage } from '@/lib/pdf/templates/toc'

export function usePdfMeasurement(
  orderedPosts: ThreadsPost[],
  profile: ThreadsProfile | null,
  bookStructure: BookStructure | null,
) {
  const [pages, setPages] = useState<string[]>([])
  const [measuring, setMeasuring] = useState(false)
  const [pageAssignmentsRef, setPageAssignmentsRef] = useState<MeasuredBlock[][] | null>(null)
  const [pageMappingRef, setPageMappingRef] = useState<PageMapping | null>(null)

  useEffect(() => {
    if (orderedPosts.length === 0 || !profile) {
      setPages([])
      setPageAssignmentsRef(null)
      setPageMappingRef(null)
      return
    }

    let cancelled = false

    async function measure() {
      setMeasuring(true)
      let iframe: HTMLIFrameElement | null = null
      try {
        const blocks = generateContentBlocks(orderedPosts, profile!, bookStructure ?? undefined)
        const { measured, iframe: measureIframe } = await measureBlockHeights(blocks)
        iframe = measureIframe
        if (cancelled) return

        // Split oversized blocks
        const split = await splitOversizedBlocks(measured, iframe)
        if (cancelled) return

        // First pass: assign blocks to get page numbers
        let pageAssignments = assignBlocksToPages(split)
        let pageMapping = buildPageMapping(pageAssignments)

        // Second pass: regenerate TOC with page numbers if book structure exists
        if (bookStructure) {
          const tocHtml = generateTocPage(bookStructure, pageMapping)
          // Find and replace TOC blocks in the split array
          const tocIndices: number[] = []
          for (let j = 0; j < split.length; j++) {
            if (split[j].type === 'toc') tocIndices.push(j)
          }

          if (tocIndices.length > 0) {
            // Create new TOC block with page numbers
            const newTocBlock: MeasuredBlock = {
              id: 'toc',
              html: tocHtml,
              type: 'toc',
              fullPage: true,
              measuredHeight: split[tocIndices[0]].measuredHeight, // initial estimate
            }

            // Re-measure the new TOC block
            const { measured: remeasured } = await measureBlockHeights([newTocBlock])
            if (cancelled) return
            newTocBlock.measuredHeight = remeasured[0].measuredHeight

            // Replace old TOC block(s) with new one
            const firstTocIdx = tocIndices[0]
            split.splice(firstTocIdx, tocIndices.length, newTocBlock)

            // Re-split if needed (TOC might be different size now)
            const reSplit = await splitOversizedBlocks(
              [newTocBlock],
              iframe
            )
            if (cancelled) return
            split.splice(firstTocIdx, 1, ...reSplit)

            // Re-assign and rebuild mapping
            pageAssignments = assignBlocksToPages(split)
            pageMapping = buildPageMapping(pageAssignments)
          }
        }

        if (cancelled) return
        const html = pagesToHtml(pageAssignments)
        if (cancelled) return
        setPages(html)
        setPageAssignmentsRef(pageAssignments)
        setPageMappingRef(pageMapping)
      } catch {
        // Fallback to sync generation if measurement fails (SSR, etc.)
        if (!cancelled) {
          setPages(generatePageContents(orderedPosts, profile!, bookStructure ?? undefined))
          setPageAssignmentsRef(null)
          setPageMappingRef(null)
        }
      } finally {
        // Clean up iframe
        if (iframe && iframe.parentNode) {
          iframe.parentNode.removeChild(iframe)
        }
        if (!cancelled) {
          setMeasuring(false)
        }
      }
    }

    measure()
    return () => { cancelled = true }
  }, [orderedPosts, profile, bookStructure])

  const spreads = useMemo(() => calculateSpreads(pages), [pages])
  const [spreadTarget, setSpreadTarget] = useState<number | null>(null)

  // Build blockToSpread mapping: block ID -> spread index
  const blockToSpread = useMemo(() => {
    const mapping = new Map<string, number>()
    if (!pageAssignmentsRef || spreads.length === 0) return mapping

    // For each page, find which spread it belongs to
    for (let pageIdx = 0; pageIdx < pageAssignmentsRef.length; pageIdx++) {
      // Find spread containing this page index
      let spreadIdx = -1
      for (let s = 0; s < spreads.length; s++) {
        if (spreads[s].leftIdx === pageIdx || spreads[s].rightIdx === pageIdx) {
          spreadIdx = s
          break
        }
      }
      if (spreadIdx < 0) continue

      // Map all blocks on this page to this spread
      for (const block of pageAssignmentsRef[pageIdx]) {
        mapping.set(block.id, spreadIdx)
      }
    }
    return mapping
  }, [pageAssignmentsRef, spreads])

  const goToSpread = useCallback((spreadIdx: number | null) => {
    setSpreadTarget(spreadIdx)
  }, [])

  return { pages, measuring, spreads, spreadTarget, blockToSpread, goToSpread }
}
