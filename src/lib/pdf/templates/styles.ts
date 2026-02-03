// A5 format: 148mm x 210mm
// Margins: Top/Bottom 22mm, Left/Right 20mm
// Content area: 108mm x 166mm

export const PDF_STYLES = `
  @page {
    size: 148mm 210mm;
    margin: 22mm 20mm;
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    font-size: 10pt;
    line-height: 1.5;
    color: #1a1a1a;
    background: #ffffff;
  }

  .page {
    width: 108mm;
    min-height: 166mm;
    page-break-after: always;
    position: relative;
  }

  .page:last-child {
    page-break-after: auto;
  }

  /* Cover Page */
  .cover-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    height: 166mm;
  }

  .cover-profile-image {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    object-fit: cover;
    margin-bottom: 16px;
    border: 2px solid #e5e5e5;
  }

  .cover-profile-placeholder {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
  }

  .cover-profile-placeholder span {
    font-size: 32px;
    font-weight: bold;
    color: white;
  }

  .cover-display-name {
    font-size: 18pt;
    font-weight: 700;
    margin-bottom: 4px;
  }

  .cover-username {
    font-size: 11pt;
    color: #666;
    margin-bottom: 16px;
  }

  .cover-bio {
    font-size: 10pt;
    color: #333;
    max-width: 80%;
    margin-bottom: 16px;
    white-space: pre-wrap;
  }

  .cover-stats {
    font-size: 9pt;
    color: #666;
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

  /* Content Page */
  .post {
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid #eee;
  }

  .post:last-child {
    border-bottom: none;
  }

  .post-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .post-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    object-fit: cover;
  }

  .post-avatar-placeholder {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .post-avatar-placeholder span {
    font-size: 12px;
    font-weight: bold;
    color: white;
  }

  .post-meta {
    flex: 1;
  }

  .post-username {
    font-size: 9pt;
    font-weight: 600;
  }

  .post-date {
    font-size: 8pt;
    color: #999;
  }

  .post-content {
    font-size: 10pt;
    line-height: 1.6;
    white-space: pre-wrap;
    word-wrap: break-word;
    margin-bottom: 10px;
  }

  .post-images {
    display: flex;
    gap: 8px;
    margin-bottom: 10px;
  }

  .post-image {
    max-width: 48%;
    max-height: 120px;
    object-fit: cover;
    border-radius: 8px;
  }

  .post-stats {
    display: flex;
    gap: 16px;
    font-size: 8pt;
    color: #666;
  }

  .post-stat {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  /* Last Page */
  .last-page {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 166mm;
  }

  .last-page svg {
    width: 48px;
    height: 48px;
    opacity: 0.5;
  }
`
