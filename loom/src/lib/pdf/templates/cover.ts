import { ThreadsProfile, LOOM_LOGO_SVG, escapeHtml } from "@loom/shared";

export function generateCoverPage(
  profile: ThreadsProfile,
  bookTitle?: string,
): string {
  const bookTitleHtml = bookTitle
    ? `<div class="book-title">${escapeHtml(bookTitle)}</div>`
    : "";

  return `
    <div class="page cover-page">
      ${bookTitleHtml}
      <div class="cover-author">
        <div class="cover-author-info">
          <div class="cover-display-name">${escapeHtml(profile.displayName)}</div>
          <div class="cover-username">@${escapeHtml(profile.username)}</div>
        </div>
      </div>
      <div class="cover-logo">${LOOM_LOGO_SVG}</div>
    </div>
  `;
}
