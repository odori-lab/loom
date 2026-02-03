import { ThreadsPost, ThreadsProfile } from '@/types/threads'
import { PDF_STYLES } from './templates/styles'
import { generateCoverPage } from './templates/cover'
import { generateContentPage } from './templates/content'
import { generateLastPage } from './templates/last'
import { calculateLayout } from './layout'

export function generatePdfHtml(
  posts: ThreadsPost[],
  profile: ThreadsProfile
): string {
  // Calculate page layouts
  const pageLayouts = calculateLayout(posts)

  // Generate all pages
  const coverPage = generateCoverPage(profile)
  const contentPages = pageLayouts
    .map(layout => generateContentPage(layout.posts, profile))
    .join('')
  const lastPage = generateLastPage()

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>${PDF_STYLES}</style>
      </head>
      <body>
        ${coverPage}
        ${contentPages}
        ${lastPage}
      </body>
    </html>
  `
}
