import { BookStructure } from "../../types/book";
import { escapeHtml } from "../../format";

// Maps block ID to its 1-based page number
export type PageMapping = Map<string, number>;

export function generateTocPage(
	bookStructure: BookStructure,
	pageMapping?: PageMapping,
): string {
	const chaptersHtml = bookStructure.chapters
		.map((chapter, index) => {
			const chapterNum = index + 1;

			const subChaptersHtml = chapter.subChapters
				.map((sub, subIdx) => {
					const subPageNum = pageMapping?.get(
						`sub-chapter-${index}-${subIdx}`,
					);
					const subPageSpan = subPageNum
						? `<span class="toc-page-number">${subPageNum}</span>`
						: "";
					return `<div class="toc-sub-chapter"><span>${chapterNum}.${subIdx + 1} ${escapeHtml(sub.title)}</span>${subPageSpan}</div>`;
				})
				.join("");

			const chapterPageNum = pageMapping?.get(`chapter-${index}`);
			const chapterPageSpan = chapterPageNum
				? `<span class="toc-page-number">${chapterPageNum}</span>`
				: "";

			return `
        <div class="toc-item">
          <div class="toc-chapter-number">${chapterNum}</div>
          <div class="toc-chapter-info">
            <div class="toc-chapter-title"><span>${escapeHtml(chapter.title)}</span>${chapterPageSpan}</div>
            ${subChaptersHtml ? `<div class="toc-sub-chapters">${subChaptersHtml}</div>` : ""}
          </div>
        </div>
      `;
		})
		.join("");

	return `
    <div class="toc-content">
      <div class="toc-header">Contents</div>
      <div class="toc-list">
        ${chaptersHtml}
      </div>
    </div>
  `;
}
