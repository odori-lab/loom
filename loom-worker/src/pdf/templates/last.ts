import { LOOM_LOGO_SVG } from './logo'

export function generateLastPage(): string {
  return `
    <div class="page last-page">
      ${LOOM_LOGO_SVG}
    </div>
  `
}
