// A5 format: 148mm x 210mm
// Margins: Top/Bottom 22mm, Left/Right 20mm
// Content area: 108mm x 166mm

// Single unified styles for both PDF and Preview
export const PDF_STYLES = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: system-ui, -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
    font-size: 10pt;
    line-height: 1.5;
    color: #1a1a1a;
    background: #ffffff;
    margin: 0;
    padding: 0;
  }

  .page {
    width: 148mm;
    min-height: 210mm;
    padding: 22mm 20mm;
    position: relative;
    background: #ffffff;
  }

  /* Cover Page */
  .page.cover-page {
    display: flex;
    flex-direction: column;
  }

  .cover-content {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
  }

  .cover-info {
    flex: 1;
  }

  .cover-avatar {
    flex-shrink: 0;
  }

  .cover-profile-image {
    width: 84px;
    height: 84px;
    border-radius: 50%;
    object-fit: cover;
    border: 1px solid #e5e5e5;
  }

  .cover-profile-placeholder {
    width: 84px;
    height: 84px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .cover-profile-placeholder span {
    font-size: 32px;
    font-weight: bold;
    color: white;
  }

  .cover-display-name {
    font-size: 16pt;
    font-weight: 700;
    margin: 0 0 2px 0;
    line-height: 1.4;
  }

  .cover-username {
    font-size: 10pt;
    color: #999;
    margin-bottom: 12px;
  }

  .cover-bio {
    font-size: 10pt;
    color: #1a1a1a;
    line-height: 1.5;
    margin-bottom: 12px;
    white-space: pre-wrap;
  }

  .cover-stats {
    font-size: 9pt;
    color: #999;
  }

  .cover-logo {
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
  }

  .cover-logo svg {
    width: 24px;
    height: 24px;
    opacity: 0.3;
  }

  /* Content Page - Threads-style layout (flex + grid hybrid) */
  .post {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-bottom: 20px;
    border-bottom: 1px solid #f0f0f0;
    font-size: 9.5pt;
    line-height: 1.4;
  }

  .post:last-child {
    border-bottom: none;
  }

  /* Row 1: Avatar + Header (grid) */
  .post-row-header {
    display: grid;
    grid-template-columns: 40px 1fr;
    column-gap: 12px;
    margin-bottom: 2px;
  }

  .post-avatar-cell {
    grid-column: 1;
    grid-row: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .post-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    object-fit: cover;
  }

  .post-avatar-placeholder {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .post-avatar-placeholder span {
    font-size: 14px;
    font-weight: bold;
    color: white;
  }

  .post-header {
    grid-column: 2;
    grid-row: 1;
    display: flex;
    align-items: center;
    gap: 6px;
    line-height: 1.4;
  }

  .post-username {
    font-size: 9.5pt;
    font-weight: 600;
    color: #000;
  }

  .post-date {
    font-size: 9.5pt;
    color: #999;
  }

  /* Content area - full width (below header row) */
  .post-text {
    font-size: 9.5pt;
    line-height: 1.4;
    white-space: pre-wrap;
    word-wrap: break-word;
    color: #000;
  }

  .post-images {
    margin-top: 8px;
  }

  .post-image {
    max-width: 100%;
    max-height: 140px;
    object-fit: cover;
    border-radius: 12px;
  }

  .post-stats {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .post-stat {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .post-stat-icon {
    width: 16px;
    height: 16px;
    color: #999;
  }

  .post-stat-like {
    fill: transparent;
    stroke: currentColor;
  }

  .post-stat-reply {
    fill: transparent;
    stroke: currentColor;
  }

  .post-stat-repost {
    fill: currentColor;
    stroke: none;
  }

  .post-stat-share {
    fill: transparent;
    stroke: currentColor;
  }

  .post-stat-count {
    font-size: 8.5pt;
    color: #999;
    line-height: 1;
  }

  /* Post continuation styles */
  .post-continuation {
    font-size: 8pt;
    color: #999;
    font-style: italic;
    margin-bottom: 4px;
  }

  .post-continues {
    font-size: 8pt;
    color: #999;
    font-style: italic;
    margin-top: 6px;
    text-align: right;
  }

  .post-continuation-chunk {
    border-top: none;
    padding-top: 0;
  }

  .post-continues-chunk {
    border-bottom: none;
  }

  /* Last Page */
  .page.last-page {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .last-page svg {
    width: 48px;
    height: 48px;
    opacity: 0.5;
  }
`
