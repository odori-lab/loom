import { chromium } from 'playwright-core'
import chromiumPkg from '@sparticuz/chromium-min'
import { PDFDocument } from 'pdf-lib'
import { generatePageHtml } from './generator'

async function getBrowser() {
  if (process.env.NODE_ENV === 'development') {
    return chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    })
  }

  // Production (Vercel) - use AWS Lambda optimized chromium
  return chromium.launch({
    args: chromiumPkg.args,
    executablePath: await chromiumPkg.executablePath(),
    headless: true,
  })
}

export async function renderPagesToPdf(pages: string[]): Promise<Buffer> {
  const browser = await getBrowser()
  const context = await browser.newContext()

  const mergedPdf = await PDFDocument.create()

  for (const pageContent of pages) {
    const page = await context.newPage()

    const htmlContent = generatePageHtml(pageContent)
    await page.setContent(htmlContent, { waitUntil: 'networkidle' })

    const pdfBuffer = await page.pdf({
      width: '148mm',
      height: '210mm',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })

    const pagePdf = await PDFDocument.load(pdfBuffer)
    const [copiedPage] = await mergedPdf.copyPages(pagePdf, [0])
    mergedPdf.addPage(copiedPage)

    await page.close()
  }

  await context.close()
  await browser.close()

  return Buffer.from(await mergedPdf.save())
}
