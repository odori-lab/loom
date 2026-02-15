import { BookChapter } from '@/types/book'
import { escapeHtml } from '@/lib/utils/format'

export function generateChapterTitlePage(chapter: BookChapter, index: number): string {
  const chapterNum = index + 1

  return `
    <div class="page chapter-title-page">
      <div class="chapter-title-content">
        <div class="chapter-number">Chapter ${chapterNum}</div>
        <div class="chapter-title">${escapeHtml(chapter.title)}</div>
        ${chapter.description ? `<div class="chapter-description">${escapeHtml(chapter.description)}</div>` : ''}
      </div>
    </div>
  `
}

export function generateSubChapterTitle(title: string, chapterIndex?: number, subIndex?: number): string {
  const label = chapterIndex !== undefined && subIndex !== undefined
    ? `${chapterIndex + 1}.${subIndex + 1} `
    : ''
  return `
    <div class="sub-chapter-header">
      <div class="sub-chapter-title">${label}${escapeHtml(title)}</div>
    </div>
  `
}
