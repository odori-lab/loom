import { chromium, Browser } from 'playwright';
import { writeFileSync } from 'fs';
import sharp from 'sharp';

let browserInstance: Browser | null = null;
let taskChain: Promise<void> = Promise.resolve();

// Convert image URL to base64 data URL with compression
async function imageUrlToBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.threads.net/',
      },
    });

    if (!response.ok) {
      console.error(`[PDF] Failed to fetch image: ${url} (${response.status})`);
      return url; // Return original URL on failure
    }

    const buffer = await response.arrayBuffer();

    // Compress and resize image for PDF (max width 1200px, JPEG quality 85%)
    const compressedBuffer = await sharp(Buffer.from(buffer))
      .resize(1200, null, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({
        quality: 85,
        progressive: true
      })
      .toBuffer();

    const base64 = compressedBuffer.toString('base64');
    console.log(`[PDF] Compressed image: ${buffer.byteLength} → ${compressedBuffer.length} bytes (${Math.round(compressedBuffer.length / buffer.byteLength * 100)}%)`);

    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error(`[PDF] Error converting image to base64:`, error);
    return url; // Return original URL on error
  }
}

// Replace all image URLs in HTML with base64 data URLs
async function convertImagesToBase64(html: string): Promise<string> {
  // Find all img src URLs (matching cdninstagram.com or any external URL)
  const imgRegex = /<img\s+[^>]*src="([^"]+)"[^>]*>/g;
  const matches = Array.from(html.matchAll(imgRegex));

  if (matches.length === 0) {
    console.log('[PDF] No images found in HTML');
    return html;
  }

  console.log(`[PDF] Converting ${matches.length} images to base64...`);

  // Download all images in parallel
  const urlToBase64 = new Map<string, string>();
  await Promise.all(
    matches.map(async (match) => {
      const originalUrl = match[1]!;
      if (!urlToBase64.has(originalUrl) && !originalUrl.startsWith('data:')) {
        const base64Url = await imageUrlToBase64(originalUrl);
        urlToBase64.set(originalUrl, base64Url);
      }
    })
  );

  // Replace all image URLs with base64 data URLs
  let result = html;
  for (const [originalUrl, base64Url] of urlToBase64.entries()) {
    result = result.replaceAll(originalUrl, base64Url);
  }

  console.log(`[PDF] Successfully converted ${urlToBase64.size} unique images to base64`);
  return result;
}

async function getBrowser(): Promise<Browser> {
  if (browserInstance) return browserInstance;
  browserInstance = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--allow-running-insecure-content',
      '--disable-blink-features=AutomationControlled',
    ],
  });
  return browserInstance;
}

// Core: render a single HTML document to a multi-page PDF
async function doRenderHtmlToPdf(html: string): Promise<Buffer> {
  // Convert all external images to base64 data URLs to avoid CORS/loading issues
  const htmlWithBase64Images = await convertImagesToBase64(html);

  const browser = await getBrowser();
  const page = await browser.newPage();

  // Set longer timeout for slow image loading
  page.setDefaultTimeout(60000);

  // Add headers for image requests (Instagram/Threads CDN requires proper headers)
  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.threads.net/',
    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
  });

  // Debug: save HTML to file if DEBUG_PDF_HTML is set
  if (process.env.DEBUG_PDF_HTML) {
    const timestamp = Date.now();
    const filename = `/tmp/pdf-debug-${timestamp}.html`;
    writeFileSync(filename, htmlWithBase64Images, 'utf-8');
    console.log(`[PDF] Saved HTML to ${filename}`);
  }

  await page.setContent(htmlWithBase64Images, { waitUntil: 'load', timeout: 60000 });

  // Wait for fonts to load
  await page.evaluate(() => document.fonts.ready);

  // Base64 images load instantly, but wait a bit for rendering to settle
  await page.waitForTimeout(500);

  // Verify all images are loaded
  const imageCount = await page.evaluate(() => {
    const images = Array.from(document.images);
    const loaded = images.filter(img => img.complete && img.naturalWidth > 0).length;
    console.log(`[PDF] ${loaded}/${images.length} images loaded`);
    return images.length;
  });

  console.log(`[PDF] Rendering PDF with ${imageCount} images`);

  const pdfBuffer = await page.pdf({
    width: '148mm',
    height: '210mm',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });

  await page.close();
  return Buffer.from(pdfBuffer);
}

// Combine multiple full-HTML pages into one document, then render
async function doRenderPagesToPdf(pages: string[]): Promise<Buffer> {
  const bodyContents = pages.map(html => {
    const match = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    return match ? match[1]! : html;
  });

  const headMatch = pages[0]?.match(/<head[^>]*>([\s\S]*)<\/head>/i);
  const headContent = headMatch ? headMatch[1]! : '';

  const combinedHtml = `<!DOCTYPE html><html>
<head>
  ${headContent}
  <style>
    .page { page-break-after: always; }
    .page:last-child { page-break-after: auto; }
  </style>
</head>
<body>
  ${bodyContents.join('\n')}
</body>
</html>`;

  return doRenderHtmlToPdf(combinedHtml);
}

// Public API: render multiple full-HTML pages (used by /generate-pdf)
export function renderPagesToPdf(pages: string[]): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    taskChain = taskChain.then(async () => {
      try {
        const result = await doRenderPagesToPdf(pages);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  });
}

// Public API: render a single combined HTML document (used by /create-loom)
export function renderHtmlToPdf(html: string): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    taskChain = taskChain.then(async () => {
      try {
        const result = await doRenderHtmlToPdf(html);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  });
}
