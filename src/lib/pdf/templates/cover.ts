import { ThreadsProfile } from '@/types/threads'
import { LOOM_LOGO_SVG } from './logo'
import { formatNumber, escapeHtml } from '@/lib/utils/format'

export function generateCoverPage(profile: ThreadsProfile): string {
  const profileImage = profile.profileImageUrl
    ? `<img src="${profile.profileImageUrl}" alt="" class="cover-profile-image" />`
    : `<div class="cover-profile-placeholder"><span>${profile.username[0].toUpperCase()}</span></div>`

  const followerText = profile.followerCount > 0
    ? `${formatNumber(profile.followerCount)} followers`
    : ''

  return `
    <div class="page cover-page">
      <div class="cover-content">
        <div class="cover-info">
          <h1 class="cover-display-name">${escapeHtml(profile.displayName)}</h1>
          <div class="cover-username">${escapeHtml(profile.username)}</div>
          ${profile.bio ? `<div class="cover-bio">${escapeHtml(profile.bio)}</div>` : ''}
          ${followerText ? `<div class="cover-stats">${followerText}</div>` : ''}
        </div>
        <div class="cover-avatar">
          ${profileImage}
        </div>
      </div>
      <div class="cover-logo">${LOOM_LOGO_SVG}</div>
    </div>
  `
}
