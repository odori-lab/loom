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
    height: 210mm;
    padding: 22mm 20mm;
    position: relative;
    background: #ffffff;
    overflow: hidden;
  }

  /* Cover Page */
  .page.cover-page {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
  }

  .cover-spacer {
    flex: 1;
  }

  .cover-author {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 12px;
  }

  .cover-author-info {
    text-align: right;
  }

  .cover-avatar {
    flex-shrink: 0;
  }

  .cover-profile-image {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    object-fit: cover;
    border: 1px solid #e5e5e5;
  }

  .cover-profile-placeholder {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .cover-profile-placeholder span {
    font-size: 18px;
    font-weight: bold;
    color: white;
  }

  .cover-display-name {
    font-size: 10pt;
    font-weight: 600;
    margin: 0 0 1px 0;
    line-height: 1.3;
    color: #333;
  }

  .cover-username {
    font-size: 8.5pt;
    color: #999;
  }

  .cover-logo {
    position: absolute;
    bottom: 28mm;
    left: 50%;
    transform: translateX(-50%);
  }

  .cover-logo svg {
    width: 20px;
    height: 20px;
    opacity: 0.25;
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

  /* Book Title on Cover */
  .book-title {
    font-size: 18pt;
    font-weight: 700;
    color: #000;
    margin-bottom: 16px;
    line-height: 1.3;
    letter-spacing: -0.01em;
  }

  /* Table of Contents Page */
  .page.toc-page {
    display: flex;
    flex-direction: column;
  }

  .toc-header {
    font-size: 14pt;
    font-weight: 700;
    color: #000;
    margin-bottom: 32px;
    letter-spacing: -0.01em;
  }

  .toc-list {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .toc-item {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid #f0f0f0;
  }

  .toc-item:last-child {
    border-bottom: none;
  }

  .toc-chapter-number {
    font-size: 12pt;
    font-weight: 700;
    color: #999;
    min-width: 24px;
    line-height: 1.4;
  }

  .toc-chapter-info {
    flex: 1;
  }

  .toc-chapter-title {
    font-size: 11pt;
    font-weight: 600;
    color: #000;
    line-height: 1.4;
    margin-bottom: 4px;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .toc-chapter-desc {
    font-size: 9pt;
    color: #737373;
    line-height: 1.5;
  }

  .toc-sub-chapters {
    margin-top: 6px;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .toc-sub-chapter {
    font-size: 8.5pt;
    color: #999;
    padding-left: 8px;
    line-height: 1.4;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .toc-page-number {
    font-size: 9pt;
    color: #999;
    font-weight: 400;
    margin-left: 8px;
    white-space: nowrap;
  }

  .toc-sub-chapter .toc-page-number {
    font-size: 8pt;
  }

  /* TOC items when placed directly in page (split TOC) */
  .toc-page > .toc-item {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid #f0f0f0;
    margin-bottom: 4px;
  }

  .toc-page > .toc-item:last-child {
    border-bottom: none;
  }

  /* Preface Page */
  .page.preface-page {
    display: flex;
    flex-direction: column;
  }

  .preface-header {
    font-size: 14pt;
    font-weight: 700;
    color: #000;
    margin-bottom: 24px;
    letter-spacing: -0.01em;
  }

  .preface-text {
    font-size: 10.5pt;
    line-height: 1.8;
    color: #1a1a1a;
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  /* Chapter Title Page */
  .page.chapter-title-page {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .chapter-title-content {
    text-align: center;
    max-width: 85%;
  }

  .chapter-number {
    font-size: 9pt;
    font-weight: 600;
    color: #999;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 12px;
  }

  .chapter-title {
    font-size: 16pt;
    font-weight: 700;
    color: #000;
    line-height: 1.3;
    margin-bottom: 16px;
    letter-spacing: -0.01em;
  }

  .chapter-description {
    font-size: 9.5pt;
    color: #737373;
    line-height: 1.6;
  }

  /* Sub-chapter Header */
  .sub-chapter-header {
    margin-bottom: 16px;
  }

  .sub-chapter-title {
    font-size: 11pt;
    font-weight: 600;
    color: #000;
    line-height: 1.4;
  }

  /* Essay-style Post */
  .essay-post {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 20px;
    font-size: 10pt;
    line-height: 1.7;
  }

  .essay-post:last-child {
    margin-bottom: 0;
  }

  .essay-post-header {
    font-size: 8pt;
    color: #999;
    letter-spacing: 0.02em;
  }

  .essay-post-text {
    font-size: 10pt;
    line-height: 1.7;
    white-space: pre-wrap;
    word-wrap: break-word;
    color: #000;
  }

  .essay-inline-image {
    max-width: 100%;
    max-height: 200px;
    min-height: 100px;
    object-fit: contain;
    border-radius: 8px;
    margin: 12px 0;
  }

  .essay-figure {
    margin: 12px 0;
    text-align: center;
  }

  .essay-image-row {
    display: flex;
    gap: 6px;
    justify-content: center;
    flex-wrap: wrap;
  }

  .essay-image-row .essay-inline-image {
    margin: 0;
    flex: 0 1 auto;
    min-width: 0;
    max-width: 100%;
    max-height: 200px;
    min-height: 100px;
    object-fit: contain;
  }

  .essay-image-caption {
    font-size: 8pt;
    color: #999;
    font-style: italic;
    margin-top: 4px;
    line-height: 1.4;
  }

  /* Page Numbers */
  .page-number {
    position: absolute;
    bottom: 12mm;
    left: 50%;
    transform: translateX(-50%);
    font-size: 8pt;
    color: #999;
  }
`
