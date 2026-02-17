import { ThreadsProfile, escapeHtml } from "@loom/shared";

export function generateAuthorPage(profile: ThreadsProfile): string {
  const profileImage = profile.profileImageUrl
    ? `<img src="${profile.profileImageUrl}" alt="" class="author-profile-image" />`
    : `<div class="author-profile-placeholder"><span>${profile.username[0].toUpperCase()}</span></div>`;

  const bioHtml = profile.bio
    ? `<div class="author-bio">${escapeHtml(profile.bio)}</div>`
    : "";

  return `
    <div class="page author-page">
      <div class="author-content">
        <div class="author-header">
          ${profileImage}
          <div class="author-info">
            <div class="author-display-name">${escapeHtml(profile.displayName)}</div>
            <div class="author-username">@${escapeHtml(profile.username)}</div>
          </div>
        </div>
        ${bioHtml}
      </div>
    </div>
  `;
}
