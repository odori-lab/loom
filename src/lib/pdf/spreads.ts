export interface SpreadData {
  left: string | null
  right: string | null
  leftIdx: number
  rightIdx: number
}

export function calculateSpreads(pages: string[]): SpreadData[] {
  if (pages.length === 0) return []

  const result: SpreadData[] = []

  // Spread 0: Cover page (right side only)
  result.push({ left: null, right: pages[0], leftIdx: -1, rightIdx: 0 })

  // Content pages (pairs)
  const contentPages = pages.slice(1, -1) // Exclude cover and last
  const lastPage = pages[pages.length - 1]

  for (let i = 0; i < contentPages.length; i += 2) {
    const leftIdx = i + 1
    const rightIdx = i + 2
    result.push({
      left: contentPages[i],
      right: contentPages[i + 1] || null,
      leftIdx,
      rightIdx: contentPages[i + 1] ? rightIdx : -1
    })
  }

  // Last page handling - always on the left (like back cover)
  result.push({
    left: lastPage,
    right: null,
    leftIdx: pages.length - 1,
    rightIdx: -1
  })

  return result
}
