import { ThreadsPost, ThreadsProfile } from '@/types/threads'

export function generateContentPage(posts: ThreadsPost[], profile: ThreadsProfile): string {
  const postsHtml = posts.map(post => generatePostHtml(post, profile)).join('')

  return `
    <div class="page">
      ${postsHtml}
    </div>
  `
}

function generatePostHtml(post: ThreadsPost, profile: ThreadsProfile): string {
  const avatar = profile.profileImageUrl
    ? `<img src="${profile.profileImageUrl}" alt="" class="post-avatar" />`
    : `<div class="post-avatar-placeholder"><span>${post.username[0].toUpperCase()}</span></div>`

  const dateStr = formatDate(new Date(post.postedAt))

  const imagesHtml = post.imageUrls.length > 0
    ? `<div class="post-images">${post.imageUrls.map(url => `<img src="${url}" alt="" class="post-image" />`).join('')}</div>`
    : ''

  return `
    <div class="post">
      <div class="post-header">
        ${avatar}
        <div class="post-meta">
          <div class="post-username">@${escapeHtml(post.username)}</div>
          <div class="post-date">${dateStr}</div>
        </div>
      </div>
      <div class="post-content">${escapeHtml(post.content)}</div>
      ${imagesHtml}
      <div class="post-stats">
        <span class="post-stat">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
          ${formatNumber(post.likeCount)}
        </span>
        <span class="post-stat">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
          ${formatNumber(post.replyCount)}
        </span>
        <span class="post-stat">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 1l4 4-4 4"></path>
            <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
            <path d="M7 23l-4-4 4-4"></path>
            <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
          </svg>
          ${formatNumber(post.repostCount)}
        </span>
      </div>
    </div>
  `
}

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}.${month}.${day}`
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
