import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
import { PDFDocument } from 'pdf-lib'
import { generatePageHtml } from './generator'

async function getBrowser() {
  if (process.env.NODE_ENV === 'development') {
    return puppeteer.launch({
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      headless: true,
    })
  }

  // For Vercel serverless environment
  // Set environment variables for fonts
  process.env.FONTCONFIG_PATH = process.env.FONTCONFIG_PATH || '/tmp'
  process.env.HOME = process.env.HOME || '/tmp'

  return puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  })
}

export async function renderPagesToPdf(pages: string[]): Promise<Buffer> {
  const browser = await getBrowser()

  const mergedPdf = await PDFDocument.create()

  for (const pageContent of pages) {
    const page = await browser.newPage()

    const htmlContent = generatePageHtml(pageContent)
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' })

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

  await browser.close()

  return Buffer.from(await mergedPdf.save())
}
