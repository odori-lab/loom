import { BookStructure } from '@/types/book'
import { escapeHtml } from '@/lib/utils/format'

export function generateTocPage(bookStructure: BookStructure): string {
  const chaptersHtml = bookStructure.chapters
    .map((chapter, index) => {
      const chapterNum = index + 1

      const subChaptersHtml = chapter.subChapters
        .map((sub, subIdx) => `<div class="toc-sub-chapter">${chapterNum}.${subIdx + 1} ${escapeHtml(sub.title)}</div>`)
        .join('')

      return `
        <div class="toc-item">
          <div class="toc-chapter-number">${chapterNum}</div>
          <div class="toc-chapter-info">
            <div class="toc-chapter-title">${escapeHtml(chapter.title)}</div>
            ${chapter.description ? `<div class="toc-chapter-desc">${escapeHtml(chapter.description)}</div>` : ''}
            ${subChaptersHtml ? `<div class="toc-sub-chapters">${subChaptersHtml}</div>` : ''}
          </div>
        </div>
      `
    })
    .join('')

  return `
    <div class="page toc-page">
      <div class="toc-header">Contents</div>
      <div class="toc-list">
        ${chaptersHtml}
      </div>
    </div>
  `
}
