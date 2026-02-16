import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { scraperWorker } from './scraper-worker';
import { renderPagesToPdf, renderHtmlToPdf } from './pdf-renderer';
import { generatePageContents, generatePageHtml, generateAllPagesHtml } from './pdf/generator';
import { getSupabase } from './supabase';
import crypto from 'crypto';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API key authentication middleware
const WORKER_API_KEY = process.env.WORKER_API_KEY;

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction): void {
  if (!WORKER_API_KEY) {
    // No key configured = auth disabled (local dev)
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${WORKER_API_KEY}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Scrape endpoint (public — called directly from client to bypass Vercel timeout)
app.post('/scrape', async (req, res) => {
  const { username, limit = 50 } = req.body;

  if (!username) {
    res.status(400).json({ error: 'Username is required' });
    return;
  }

  try {
    const result = await scraperWorker.scrapeProfile(username, limit);

    if (!result.success) {
      res.status(503).json(result);
      return;
    }

    res.json(result);
  } catch (error) {
    console.error('Scrape error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Export session cookies endpoint
app.post('/export-cookies', requireAuth, async (_req, res) => {
  try {
    const cookies = await scraperWorker.exportSessionCookies();

    if (!cookies) {
      res.status(404).json({ error: 'No active session. Run /scrape first to establish a session.' });
      return;
    }

    res.json({ cookies });
  } catch (error) {
    console.error('Export cookies error:', error);
    res.status(500).json({
      error: 'Failed to export cookies',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Generate PDF endpoint
app.post('/generate-pdf', requireAuth, async (req, res) => {
  const { pages } = req.body;

  if (!pages || !Array.isArray(pages) || pages.length === 0) {
    res.status(400).json({ error: 'pages array is required' });
    return;
  }

  try {
    console.log(`[PDF] Rendering ${pages.length} pages to PDF...`);
    const startTime = Date.now();
    const pdfBuffer = await renderPagesToPdf(pages);
    const duration = Date.now() - startTime;
    console.log(`[PDF] Generated PDF (${pdfBuffer.length} bytes) in ${duration}ms`);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length.toString());
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({
      error: 'Failed to generate PDF',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create loom endpoint (public — called directly from client to bypass Vercel timeout)
app.post('/create-loom', async (req, res) => {
  const { posts, profile, userId, bookStructure } = req.body;

  if (!posts || !Array.isArray(posts) || posts.length === 0) {
    res.status(400).json({ error: 'posts array is required' });
    return;
  }
  if (!profile) {
    res.status(400).json({ error: 'profile is required' });
    return;
  }
  if (!userId) {
    res.status(400).json({ error: 'userId is required' });
    return;
  }

  try {
    console.log(`[CreateLoom] Generating PDF for ${posts.length} posts by @${profile.username}...`);
    const startTime = Date.now();

    // 1. Generate page contents (same logic as frontend preview)
    const pageContents = generatePageContents(posts, profile, bookStructure);

    // 2. Combine all pages into a single HTML document for fast single-pass rendering
    const html = generateAllPagesHtml(pageContents);

    // 3. Render to PDF (single tab, ~5x faster than per-page rendering)
    const pdfBuffer = await renderHtmlToPdf(html);

    // 4. Upload to Supabase Storage
    const loomId = crypto.randomUUID();
    const pdfPath = `${userId}/${loomId}.pdf`;

    const { error: uploadError } = await getSupabase().storage
      .from('looms-pdf')
      .upload(pdfPath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      console.error('[CreateLoom] Upload error:', uploadError);
      res.status(500).json({
        error: 'Failed to upload PDF',
        message: uploadError.message,
      });
      return;
    }

    const duration = Date.now() - startTime;
    const sizeMB = (pdfBuffer.length / (1024 * 1024)).toFixed(2);
    console.log(`[CreateLoom] Done in ${duration}ms - ${sizeMB}MB (${pdfBuffer.length} bytes), path: ${pdfPath}`);

    res.json({
      success: true,
      pdfPath,
      loomId,
    });
  } catch (error) {
    console.error('[CreateLoom] Error:', error);
    res.status(500).json({
      error: 'Failed to create loom',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.listen(PORT, () => {
  console.log(`loom-worker running on port ${PORT}`);
});
