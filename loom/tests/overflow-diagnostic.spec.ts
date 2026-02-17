import { test } from "@playwright/test";

test.describe("Overflow Diagnostic - Detailed Analysis", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/test-preview");
    await page.waitForFunction(
      () => {
        const el = document.getElementById("measuring-status");
        return el && el.textContent === "no";
      },
      { timeout: 30_000 },
    );
    await page.waitForFunction(
      () => {
        const el = document.getElementById("page-count");
        return el && parseInt(el.textContent || "0") > 0;
      },
      { timeout: 15_000 },
    );
  });

  test("diagnose overflow root causes across all spreads", async ({ page }) => {
    const spreadCount = parseInt(
      (await page.locator("#spread-count").textContent()) || "0",
    );
    const pageCount = parseInt(
      (await page.locator("#page-count").textContent()) || "0",
    );
    console.log(`\n=== OVERFLOW DIAGNOSTIC ===`);
    console.log(`Total pages: ${pageCount}, Total spreads: ${spreadCount}`);

    const overflowDetails: Array<{
      spread: number;
      page: number;
      scrollHeight: number;
      clientHeight: number;
      overflow: number;
      pageContent: string;
      childCount: number;
      childHeights: number[];
    }> = [];

    for (let i = 0; i < spreadCount; i++) {
      // Navigate using arrow
      if (i > 0) {
        const rightArrow = page.locator("button.absolute.right-4");
        if (
          (await rightArrow.count()) > 0 &&
          !(await rightArrow.isDisabled())
        ) {
          await rightArrow.click();
          await page.waitForTimeout(800);
        } else {
          break;
        }
      }

      const iframeElements = page.locator('iframe[title="Page preview"]');
      const iframeCount = await iframeElements.count();

      for (let j = 0; j < iframeCount; j++) {
        const result = await page
          .evaluate(async (idx) => {
            const iframes = document.querySelectorAll(
              'iframe[title="Page preview"]',
            );
            const iframe = iframes[idx] as HTMLIFrameElement;
            if (!iframe || !iframe.contentDocument) return null;

            const body = iframe.contentDocument.body;
            const pageDiv = body.querySelector(".page") || body;
            const scrollHeight = pageDiv.scrollHeight;
            const clientHeight = pageDiv.clientHeight;
            const hasOverflow = scrollHeight > clientHeight + 5;

            if (!hasOverflow) return null;

            // Get child elements info
            const children = Array.from(pageDiv.children) as HTMLElement[];
            const childHeights = children.map((c) =>
              Math.ceil(c.getBoundingClientRect().height),
            );

            // Get text content preview
            const textContent = pageDiv.textContent || "";
            const preview = textContent.substring(0, 150).replace(/\s+/g, " ");

            // Check for specific elements
            const hasImages = pageDiv.querySelectorAll("img").length;
            const hasEssayPost = pageDiv.querySelectorAll(".essay-post").length;
            const hasSubChapter = pageDiv.querySelectorAll(
              '.essay-sub-chapter-title, [class*="sub-chapter"]',
            ).length;

            // Get page CSS
            const pageStyle = window.getComputedStyle(pageDiv as Element);

            return {
              scrollHeight,
              clientHeight,
              overflow: scrollHeight - clientHeight,
              childCount: children.length,
              childHeights,
              preview,
              hasImages,
              hasEssayPost,
              hasSubChapter,
              pageHeight: pageStyle.height,
              pageOverflow: pageStyle.overflow,
              pageMinHeight: pageStyle.minHeight,
            };
          }, j)
          .catch(() => null);

        if (result) {
          overflowDetails.push({
            spread: i,
            page: j,
            scrollHeight: result.scrollHeight,
            clientHeight: result.clientHeight,
            overflow: result.overflow,
            pageContent: result.preview,
            childCount: result.childCount,
            childHeights: result.childHeights,
          });

          console.log(`\n--- Spread ${i}, Page ${j} ---`);
          console.log(
            `  Overflow: ${result.overflow}px (${result.scrollHeight} > ${result.clientHeight})`,
          );
          console.log(
            `  Children: ${result.childCount}, Heights: [${result.childHeights.join(", ")}]`,
          );
          console.log(
            `  Images: ${result.hasImages}, Essay posts: ${result.hasEssayPost}, Sub-chapters: ${result.hasSubChapter}`,
          );
          console.log(
            `  CSS: height=${result.pageHeight}, overflow=${result.pageOverflow}, minHeight=${result.pageMinHeight}`,
          );
          console.log(`  Content: "${result.preview}..."`);
        }
      }
    }

    console.log(`\n=== SUMMARY ===`);
    console.log(`Overflowing pages: ${overflowDetails.length}`);

    // Categorize overflows
    const minor = overflowDetails.filter((d) => d.overflow <= 30);
    const moderate = overflowDetails.filter(
      (d) => d.overflow > 30 && d.overflow <= 200,
    );
    const severe = overflowDetails.filter((d) => d.overflow > 200);

    console.log(`  Minor (<=30px): ${minor.length}`);
    console.log(`  Moderate (30-200px): ${moderate.length}`);
    console.log(`  Severe (>200px): ${severe.length}`);

    if (severe.length > 0) {
      console.log(`\n  Severe overflows:`);
      severe.forEach((d) => {
        console.log(
          `    Spread ${d.spread}, Page ${d.page}: +${d.overflow}px, ${d.childCount} children`,
        );
      });
    }
  });
});
