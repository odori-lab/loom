/**
 * Proxy utilities for CDN images (Instagram/Threads).
 * Centralised so every component uses the same rewrite rules.
 */

/** Proxy a single image URL through the local API route. */
export function proxyImageUrl(url: string): string {
  return `/api/proxy-image?url=${encodeURIComponent(url)}`;
}

/** Rewrite all Instagram/Facebook CDN image URLs in an HTML string to go through the proxy. */
export function proxyImageUrls(html: string): string {
  return html.replace(
    /(<img\s[^>]*src=")([^"]+(?:cdninstagram\.com|fbcdn\.net)[^"]+)(")/g,
    (_match, before, url, after) =>
      `${before}/api/proxy-image?url=${encodeURIComponent(url)}${after}`,
  );
}
