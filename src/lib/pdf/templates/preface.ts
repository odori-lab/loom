import { escapeHtml } from '@/lib/utils/format'

export function generatePrefacePage(preface: string): string {
  return `
    <div class="page preface-page">
      <div class="preface-header">Preface</div>
      <div class="preface-text">${escapeHtml(preface)}</div>
    </div>
  `
}
