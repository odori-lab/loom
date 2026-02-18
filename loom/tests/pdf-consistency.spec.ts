import { expect, test } from "@playwright/test";

test.describe("PDF Consistency - Font, Logo, TOC, Heights", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/test-preview");

    // Wait for measurement to complete
    await page.waitForFunction(
      () => {
        const el = document.getElementById("measuring-status");
        return el && el.textContent === "no";
      },
      { timeout: 30_000 },
    );

    // Wait for pages
    await page.waitForFunction(
      () => {
        const el = document.getElementById("page-count");
        return el && parseInt(el.textContent || "0", 10) > 0;
      },
      { timeout: 15_000 },
    );
  });

  test("should load Pretendard font in page iframes", async ({ page }) => {
    // Wait for iframes to load
    await page.waitForTimeout(3000);

    // Check the first visible iframe for Pretendard font
    const fontResult = await page.evaluate(async () => {
      const iframes = document.querySelectorAll('iframe[title^="Page"]');
      if (iframes.length === 0) return { error: "No iframes found" };

      const iframe = iframes[0] as HTMLIFrameElement;
      if (!iframe.contentDocument)
        return { error: "Cannot access iframe document" };

      const doc = iframe.contentDocument;

      // Check if Pretendard font link is in the head
      const links = Array.from(doc.querySelectorAll("link[rel='stylesheet']"));
      const hasFontLink = links.some((l) =>
        l.getAttribute("href")?.includes("pretendard"),
      );

      // Check computed font-family on body
      const body = doc.body;
      const computedFont = window.getComputedStyle(body).fontFamily;

      // Check CSS style content for Pretendard
      const styles = Array.from(doc.querySelectorAll("style"));
      const hasFontInCSS = styles.some((s) =>
        s.textContent?.includes("Pretendard"),
      );

      // Wait for fonts to be ready and check loaded fonts
      await doc.fonts.ready;
      const loadedFonts: string[] = [];
      doc.fonts.forEach((f) => {
        loadedFonts.push(`${f.family} (${f.status})`);
      });

      return {
        hasFontLink,
        computedFont,
        hasFontInCSS,
        loadedFonts,
        linkHrefs: links.map((l) => l.getAttribute("href")),
      };
    });

    console.log("Font check result:", JSON.stringify(fontResult, null, 2));

    expect(fontResult).not.toHaveProperty("error");
    expect(fontResult.hasFontLink).toBe(true);
    expect(fontResult.hasFontInCSS).toBe(true);

    await page.screenshot({
      path: "test-results/font-check.png",
      fullPage: false,
    });
  });

  test("should render cover logo at correct size (56x56px)", async ({
    page,
  }) => {
    // Cover page is the first iframe (Page 1)
    await page.waitForTimeout(2000);

    const logoResult = await page.evaluate(() => {
      const iframes = document.querySelectorAll('iframe[title^="Page"]');
      if (iframes.length === 0) return { error: "No iframes found" };

      // Cover is page 1, which is the first iframe
      const coverIframe = iframes[0] as HTMLIFrameElement;
      if (!coverIframe.contentDocument)
        return { error: "Cannot access cover iframe" };

      const doc = coverIframe.contentDocument;
      const logoDiv = doc.querySelector(".cover-logo");
      if (!logoDiv) return { error: "No .cover-logo element found" };

      const logoImg = logoDiv.querySelector("img");
      if (!logoImg) return { error: "No img in .cover-logo" };

      const rect = logoImg.getBoundingClientRect();
      const computedWidth = window.getComputedStyle(logoImg).width;
      const computedHeight = window.getComputedStyle(logoImg).height;

      return {
        renderedWidth: Math.round(rect.width),
        renderedHeight: Math.round(rect.height),
        computedWidth,
        computedHeight,
        naturalWidth: logoImg.naturalWidth,
        naturalHeight: logoImg.naturalHeight,
      };
    });

    console.log("Cover logo check:", JSON.stringify(logoResult, null, 2));

    expect(logoResult).not.toHaveProperty("error");
    // Logo should be 56x56px as defined in CSS
    expect(logoResult.renderedWidth).toBe(56);
    expect(logoResult.renderedHeight).toBe(56);

    await page.screenshot({
      path: "test-results/logo-check.png",
      fullPage: false,
    });
  });

  test("should render last page logo at correct size (56x56px)", async ({
    page,
  }) => {
    await page.waitForTimeout(2000);

    // Navigate to the last spread using slider
    const spreadCount = parseInt(
      (await page.locator("#spread-count").textContent()) || "0",
      10,
    );
    const slider = page.locator('input[type="range"]');
    if ((await slider.count()) > 0) {
      await slider.fill(String(spreadCount - 1));
      await page.waitForTimeout(1000);
    }

    const lastLogoResult = await page.evaluate(() => {
      const iframes = document.querySelectorAll('iframe[title^="Page"]');
      if (iframes.length === 0) return { error: "No iframes found" };

      // Check each visible iframe for .last-page
      for (let i = 0; i < iframes.length; i++) {
        const iframe = iframes[i] as HTMLIFrameElement;
        if (!iframe.contentDocument) continue;

        const doc = iframe.contentDocument;
        const lastPage = doc.querySelector(".last-page");
        if (!lastPage) continue;

        const logoImg = lastPage.querySelector("img");
        if (!logoImg) return { error: "No img in .last-page" };

        const rect = logoImg.getBoundingClientRect();
        return {
          renderedWidth: Math.round(rect.width),
          renderedHeight: Math.round(rect.height),
          computedWidth: window.getComputedStyle(logoImg).width,
          computedHeight: window.getComputedStyle(logoImg).height,
        };
      }
      return { error: "No .last-page found in visible iframes" };
    });

    console.log(
      "Last page logo check:",
      JSON.stringify(lastLogoResult, null, 2),
    );

    expect(lastLogoResult).not.toHaveProperty("error");
    expect(lastLogoResult.renderedWidth).toBe(56);
    expect(lastLogoResult.renderedHeight).toBe(56);

    await page.screenshot({
      path: "test-results/last-logo-check.png",
      fullPage: false,
    });
  });

  test("should have TOC continuation spacer on second TOC page", async ({
    page,
  }) => {
    await page.waitForTimeout(2000);

    // Get all page HTMLs and check for TOC continuation
    const tocResult = await page.evaluate(() => {
      const debugEl = document.getElementById("debug-info");
      const pageCount = parseInt(debugEl?.dataset.pages || "0", 10);

      // We need to check all pages for toc-continuation-spacer
      // The test-preview renders pages in PageListViewer
      const iframes = document.querySelectorAll('iframe[title^="Page"]');
      const results: {
        pageNum: number;
        isTocPage: boolean;
        hasTocHeader: boolean;
        hasTocContinuationSpacer: boolean;
        hasTocContent: boolean;
        spacerHeight: number;
      }[] = [];

      for (let i = 0; i < iframes.length; i++) {
        const iframe = iframes[i] as HTMLIFrameElement;
        if (!iframe.contentDocument) continue;

        const doc = iframe.contentDocument;
        const tocContent = doc.querySelector(".toc-content");
        const tocHeader = doc.querySelector(".toc-header");
        const tocSpacer = doc.querySelector(".toc-continuation-spacer");
        const tocItems = doc.querySelectorAll(".toc-item");

        if (tocContent || tocHeader || tocItems.length > 0 || tocSpacer) {
          const spacerRect = tocSpacer?.getBoundingClientRect();
          results.push({
            pageNum: i + 1,
            isTocPage: !!tocContent || tocItems.length > 0,
            hasTocHeader: !!tocHeader,
            hasTocContinuationSpacer: !!tocSpacer,
            hasTocContent: !!tocContent || tocItems.length > 0,
            spacerHeight: spacerRect ? Math.round(spacerRect.height) : 0,
          });
        }
      }

      return { pageCount, tocPages: results };
    });

    console.log("TOC check:", JSON.stringify(tocResult, null, 2));

    // There should be TOC pages
    expect(tocResult.tocPages.length).toBeGreaterThan(0);

    // If there are multiple TOC pages, the second one should have a continuation spacer
    if (tocResult.tocPages.length > 1) {
      const secondTocPage = tocResult.tocPages[1];
      console.log(
        `Second TOC page (page ${secondTocPage.pageNum}): spacer=${secondTocPage.hasTocContinuationSpacer}, spacerHeight=${secondTocPage.spacerHeight}`,
      );
      expect(secondTocPage.hasTocContinuationSpacer).toBe(true);
      expect(secondTocPage.spacerHeight).toBeGreaterThan(40); // Should be ~51px
    } else {
      console.log("Only one TOC page found - no continuation spacer needed");
    }

    await page.screenshot({
      path: "test-results/toc-check.png",
      fullPage: false,
    });
  });

  test("should not have content overflow on any page", async ({ page }) => {
    await page.waitForTimeout(3000);

    const overflowResult = await page.evaluate(async () => {
      const iframes = document.querySelectorAll('iframe[title^="Page"]');
      const issues: {
        pageNum: number;
        scrollHeight: number;
        clientHeight: number;
        pageType: string;
      }[] = [];

      for (let i = 0; i < iframes.length; i++) {
        const iframe = iframes[i] as HTMLIFrameElement;
        if (!iframe.contentDocument) continue;

        const doc = iframe.contentDocument;
        const pageDiv = doc.querySelector(".page");
        if (!pageDiv) continue;

        const scrollH = pageDiv.scrollHeight;
        const clientH = pageDiv.clientHeight;

        // Determine page type
        let pageType = "content";
        if (pageDiv.classList.contains("cover-page")) pageType = "cover";
        else if (pageDiv.classList.contains("last-page")) pageType = "last";
        else if (pageDiv.classList.contains("preface-page"))
          pageType = "preface";
        else if (pageDiv.classList.contains("toc-page")) pageType = "toc";
        else if (pageDiv.classList.contains("chapter-title-page"))
          pageType = "chapter-title";
        else if (pageDiv.classList.contains("author-page")) pageType = "author";

        // 5px tolerance
        if (scrollH > clientH + 5) {
          issues.push({
            pageNum: i + 1,
            scrollHeight: scrollH,
            clientHeight: clientH,
            pageType,
          });
        }
      }

      return { totalPages: iframes.length, overflowPages: issues };
    });

    console.log(
      `Overflow check: ${overflowResult.totalPages} pages, ${overflowResult.overflowPages.length} with overflow`,
    );
    if (overflowResult.overflowPages.length > 0) {
      console.log("Overflow issues:");
      for (const issue of overflowResult.overflowPages) {
        console.log(
          `  Page ${issue.pageNum} (${issue.pageType}): scroll=${issue.scrollHeight} > client=${issue.clientHeight}`,
        );
      }
    }

    // Allow no overflow issues
    expect(overflowResult.overflowPages.length).toBe(0);
  });

  test("should have consistent page heights (210mm)", async ({ page }) => {
    await page.waitForTimeout(2000);

    const heightResult = await page.evaluate(() => {
      const iframes = document.querySelectorAll('iframe[title^="Page"]');
      const heights: { pageNum: number; height: number; type: string }[] = [];

      for (let i = 0; i < iframes.length; i++) {
        const iframe = iframes[i] as HTMLIFrameElement;
        if (!iframe.contentDocument) continue;

        const doc = iframe.contentDocument;
        const pageDiv = doc.querySelector(".page") as HTMLElement;
        if (!pageDiv) continue;

        let pageType = "content";
        if (pageDiv.classList.contains("cover-page")) pageType = "cover";
        else if (pageDiv.classList.contains("last-page")) pageType = "last";
        else if (pageDiv.classList.contains("toc-page")) pageType = "toc";
        else if (pageDiv.classList.contains("preface-page"))
          pageType = "preface";
        else if (pageDiv.classList.contains("chapter-title-page"))
          pageType = "chapter-title";
        else if (pageDiv.classList.contains("author-page")) pageType = "author";

        const computedHeight = window.getComputedStyle(pageDiv).height;
        heights.push({
          pageNum: i + 1,
          height: parseFloat(computedHeight),
          type: pageType,
        });
      }

      return heights;
    });

    // All pages should have the same height (793px = 210mm at 96dpi)
    const expectedHeight = 793;
    const tolerance = 2; // allow 2px tolerance

    const wrongHeights = heightResult.filter(
      (h) => Math.abs(h.height - expectedHeight) > tolerance,
    );

    if (wrongHeights.length > 0) {
      console.log("Pages with incorrect height:");
      for (const h of wrongHeights) {
        console.log(
          `  Page ${h.pageNum} (${h.type}): ${h.height}px (expected ${expectedHeight}px)`,
        );
      }
    }

    expect(wrongHeights.length).toBe(0);
  });
});
