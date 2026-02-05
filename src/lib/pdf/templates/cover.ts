import { ThreadsProfile } from '@/types/threads'
import { LOOM_LOGO_SVG } from './logo'

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

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
