import { test, expect } from "@playwright/test";
import { readFileSync } from "fs";
import { resolve } from "path";

// Read the ACTUAL styles from the shared package
const PDF_STYLES = (() => {
  const filePath = resolve(__dirname, "../../packages/src/pdf/styles.ts");
  const content = readFileSync(filePath, "utf-8");
  // Extract the template literal content between backticks
  const match = content.match(/export const PDF_STYLES = `([\s\S]*?)`;/);
  return match ? match[1] : "";
})();

function makeImg(color: string, w: number, h: number) {
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect fill="${color}" width="${w}" height="${h}"/></svg>`)}`;
}

// Measure visual gaps between image rows across all figures on the page
async function measureImageGaps(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const allImages = Array.from(document.querySelectorAll(".essay-inline-image"));
    if (allImages.length === 0) return [];

    const rects = allImages.map((img) => img.getBoundingClientRect());

    // Group images into visual rows (same top ± 2px)
    const rows: { top: number; bottom: number }[] = [];
    let rowTop = rects[0].top;
    let rowBottom = rects[0].bottom;

    for (let i = 1; i < rects.length; i++) {
      if (Math.abs(rects[i].top - rowTop) > 2) {
        rows.push({ top: rowTop, bottom: rowBottom });
        rowTop = rects[i].top;
        rowBottom = rects[i].bottom;
      } else {
        rowBottom = Math.max(rowBottom, rects[i].bottom);
      }
    }
    rows.push({ top: rowTop, bottom: rowBottom });

    const gaps: number[] = [];
    for (let i = 0; i < rows.length - 1; i++) {
      gaps.push(Math.round((rows[i + 1].top - rows[i].bottom) * 10) / 10);
    }
    return gaps;
  });
}

test.describe("Image row gap - 6px target", () => {
  // Scenario A: All images in ONE figure (single post with many images)
  test("single figure with 6 images: gap should be 6px", async ({ page }) => {
    const colors = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6", "#1abc9c"];
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${PDF_STYLES}</style></head><body>
      <div class="page">
        <figure class="essay-figure">
          <div class="essay-image-row">
            ${colors.map((c) => `<img src="${makeImg(c, 200, 200)}" alt="" class="essay-inline-image" />`).join("")}
          </div>
        </figure>
      </div>
    </body></html>`;

    await page.setContent(html);
    await page.waitForTimeout(300);

    const gaps = await measureImageGaps(page);
    console.log("Single figure gaps:", gaps);
    await page.screenshot({ path: "test-results/gap-single-figure.png", fullPage: true });
    expect(gaps.length).toBe(2);
    for (const g of gaps) expect(g).toBeCloseTo(6, 0);
  });

  // Scenario B: Separate figures, NO headers (adjacent figures)
  test("3 separate figures, no headers: gap should be 6px", async ({ page }) => {
    const pairs = [["#e74c3c", "#3498db"], ["#2ecc71", "#f39c12"], ["#9b59b6", "#1abc9c"]];
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${PDF_STYLES}</style></head><body>
      <div class="page">
        ${pairs.map(([c1, c2]) => `<figure class="essay-figure"><div class="essay-image-row">
          <img src="${makeImg(c1, 200, 200)}" alt="" class="essay-inline-image" />
          <img src="${makeImg(c2, 200, 200)}" alt="" class="essay-inline-image" />
        </div></figure>`).join("")}
      </div>
    </body></html>`;

    await page.setContent(html);
    await page.waitForTimeout(300);

    const gaps = await measureImageGaps(page);
    console.log("Adjacent figures gaps:", gaps);
    await page.screenshot({ path: "test-results/gap-adjacent-figures.png", fullPage: true });
    expect(gaps.length).toBe(2);
    for (const g of gaps) expect(g).toBeCloseTo(6, 0);
  });

  // Scenario C: Figures with post-headers between (real app structure, image-only posts)
  test("figures with post-headers between: gap should be 6px (headers hidden)", async ({ page }) => {
    const pairs = [["#e74c3c", "#3498db"], ["#2ecc71", "#f39c12"], ["#9b59b6", "#1abc9c"]];
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${PDF_STYLES}</style></head><body>
      <div class="page">
        <div class="essay-post-header">Jan 15, 2024 &middot; &#9829; 42</div>
        <figure class="essay-figure"><div class="essay-image-row">
          <img src="${makeImg(pairs[0][0], 200, 200)}" alt="" class="essay-inline-image" />
          <img src="${makeImg(pairs[0][1], 200, 200)}" alt="" class="essay-inline-image" />
        </div></figure>
        <div class="essay-post-header">Feb 1, 2024 &middot; &#9829; 15</div>
        <figure class="essay-figure"><div class="essay-image-row">
          <img src="${makeImg(pairs[1][0], 200, 200)}" alt="" class="essay-inline-image" />
          <img src="${makeImg(pairs[1][1], 200, 200)}" alt="" class="essay-inline-image" />
        </div></figure>
        <div class="essay-post-header">Mar 10, 2024 &middot; &#9829; 28</div>
        <figure class="essay-figure"><div class="essay-image-row">
          <img src="${makeImg(pairs[2][0], 200, 200)}" alt="" class="essay-inline-image" />
          <img src="${makeImg(pairs[2][1], 200, 200)}" alt="" class="essay-inline-image" />
        </div></figure>
      </div>
    </body></html>`;

    await page.setContent(html);
    await page.waitForTimeout(300);

    const gaps = await measureImageGaps(page);
    console.log("Figures + headers gaps:", gaps);

    // Check that headers between figures are hidden
    const hiddenHeaders = await page.evaluate(() => {
      const headers = Array.from(document.querySelectorAll(".essay-post-header"));
      return headers.map((h) => ({
        text: h.textContent?.trim().substring(0, 20),
        display: window.getComputedStyle(h).display,
        visible: h.getBoundingClientRect().height > 0,
      }));
    });
    console.log("Post-header visibility:", hiddenHeaders);

    await page.screenshot({ path: "test-results/gap-figures-with-headers.png", fullPage: true });
    expect(gaps.length).toBe(2);
    for (const g of gaps) expect(g).toBeCloseTo(6, 0);
  });

  // Scenario D: Mixed - posts with text + images should keep normal spacing
  test("posts with text should keep normal spacing", async ({ page }) => {
    const pairs = [["#e74c3c", "#3498db"], ["#2ecc71", "#f39c12"]];
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${PDF_STYLES}</style></head><body>
      <div class="page">
        <div class="essay-post-header">Jan 15, 2024</div>
        <div class="essay-post-text">이것은 텍스트가 있는 포스트입니다.</div>
        <figure class="essay-figure"><div class="essay-image-row">
          <img src="${makeImg(pairs[0][0], 200, 200)}" alt="" class="essay-inline-image" />
          <img src="${makeImg(pairs[0][1], 200, 200)}" alt="" class="essay-inline-image" />
        </div></figure>
        <div class="essay-post-header">Feb 1, 2024</div>
        <div class="essay-post-text">이 포스트에도 텍스트가 있습니다.</div>
        <figure class="essay-figure"><div class="essay-image-row">
          <img src="${makeImg(pairs[1][0], 200, 200)}" alt="" class="essay-inline-image" />
          <img src="${makeImg(pairs[1][1], 200, 200)}" alt="" class="essay-inline-image" />
        </div></figure>
      </div>
    </body></html>`;

    await page.setContent(html);
    await page.waitForTimeout(300);

    // Headers between text+image posts should NOT be hidden
    const hiddenHeaders = await page.evaluate(() => {
      const headers = Array.from(document.querySelectorAll(".essay-post-header"));
      return headers.map((h) => ({
        text: h.textContent?.trim(),
        display: window.getComputedStyle(h).display,
      }));
    });
    console.log("Text+image posts - headers:", hiddenHeaders);

    // All headers should be visible (not hidden)
    for (const h of hiddenHeaders) {
      expect(h.display).not.toBe("none");
    }

    await page.screenshot({ path: "test-results/gap-text-and-images.png", fullPage: true });
  });
});
