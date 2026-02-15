import { ThreadsProfile } from '@/types/threads'
import { LOOM_LOGO_SVG } from './logo'
import { formatNumber, escapeHtml } from '@/lib/utils/format'

export function generateCoverPage(profile: ThreadsProfile, bookTitle?: string): string {
  const profileImage = profile.profileImageUrl
    ? `<img src="${profile.profileImageUrl}" alt="" class="cover-profile-image" />`
    : `<div class="cover-profile-placeholder"><span>${profile.username[0].toUpperCase()}</span></div>`

  const bookTitleHtml = bookTitle
    ? `<div class="book-title">${escapeHtml(bookTitle)}</div>`
    : ''

  return `
    <div class="page cover-page">
      ${bookTitleHtml}
      <div class="cover-spacer"></div>
      <div class="cover-author">
        <div class="cover-author-info">
          <div class="cover-display-name">${escapeHtml(profile.displayName)}</div>
          <div class="cover-username">@${escapeHtml(profile.username)}</div>
        </div>
        <div class="cover-avatar">
          ${profileImage}
        </div>
      </div>
      <div class="cover-logo">${LOOM_LOGO_SVG}</div>
    </div>
  `
}
