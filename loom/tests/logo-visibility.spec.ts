import { test, expect } from "@playwright/test";

test.describe("Cover & Last page logo visibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/test-preview");

    // Wait for measuring to complete
    await page.waitForFunction(
      () => {
        const el = document.getElementById("measuring-status");
        return el && el.textContent === "no";
      },
      { timeout: 30_000 },
    );

    // Wait for pages to be generated
    await page.waitForFunction(
      () => {
        const el = document.getElementById("page-count");
        return el && parseInt(el.textContent || "0") > 0;
      },
      { timeout: 15_000 },
    );
  });

  test("cover page logo should be visible and properly sized", async ({
    page,
  }) => {
    // First iframe is the cover page (page 1)
    const coverIframe = page.locator('iframe[title="Page 1"]');
    await expect(coverIframe).toBeVisible({ timeout: 10_000 });

    // Check the logo inside the cover page iframe
    const logoInfo = await coverIframe.evaluate((iframe: HTMLIFrameElement) => {
      const doc = iframe.contentDocument;
      if (!doc) return null;

      const logoContainer = doc.querySelector(".cover-logo");
      const logoImg = doc.querySelector(".cover-logo img");

      if (!logoContainer || !logoImg) {
        // Check if svg is used instead
        const logoSvg = doc.querySelector(".cover-logo svg");
        return {
          found: false,
          containerExists: !!logoContainer,
          imgExists: false,
          svgExists: !!logoSvg,
          allHTML: logoContainer?.innerHTML || "no container",
        };
      }

      const imgEl = logoImg as HTMLImageElement;
      const computed = iframe.contentWindow!.getComputedStyle(imgEl);
      const containerComputed =
        iframe.contentWindow!.getComputedStyle(logoContainer);
      const rect = imgEl.getBoundingClientRect();

      return {
        found: true,
        containerExists: true,
        imgExists: true,
        svgExists: false,
        width: rect.width,
        height: rect.height,
        computedWidth: computed.width,
        computedHeight: computed.height,
        opacity: computed.opacity,
        containerBottom: containerComputed.bottom,
        containerPosition: containerComputed.position,
        naturalWidth: imgEl.naturalWidth,
        naturalHeight: imgEl.naturalHeight,
        isVisible: rect.width > 0 && rect.height > 0,
        inlineStyle: imgEl.getAttribute("style"),
      };
    });

    console.log("Cover logo info:", JSON.stringify(logoInfo, null, 2));

    // Take screenshot of cover page
    await page.screenshot({
      path: "test-results/logo-cover.png",
      fullPage: false,
    });

    // Assertions
    expect(logoInfo).not.toBeNull();
    expect(logoInfo!.found).toBe(true);
    expect(logoInfo!.isVisible).toBe(true);
    // Cover logo should be 36px
    expect(logoInfo!.width).toBeCloseTo(36, 0);
    expect(logoInfo!.height).toBeCloseTo(36, 0);
    expect(parseFloat(logoInfo!.opacity!)).toBeCloseTo(0.5, 1);
  });

  test("last page logo should be visible and properly sized", async ({
    page,
  }) => {
    const pageCount = parseInt(
      (await page.locator("#page-count").textContent()) || "0",
    );
    console.log(`Total pages: ${pageCount}`);

    // Last page iframe
    const lastIframe = page.locator(`iframe[title="Page ${pageCount}"]`);

    // Scroll to the last page
    await lastIframe.scrollIntoViewIfNeeded({ timeout: 10_000 });
    await page.waitForTimeout(1000);

    // Check the logo inside the last page iframe
    const logoInfo = await lastIframe.evaluate((iframe: HTMLIFrameElement) => {
      const doc = iframe.contentDocument;
      if (!doc) return null;

      const lastPage = doc.querySelector(".last-page");
      if (!lastPage)
        return { found: false, isLastPage: false, bodyHTML: doc.body.innerHTML };

      const logoImg = lastPage.querySelector("img");

      if (!logoImg) {
        const logoSvg = lastPage.querySelector("svg");
        return {
          found: false,
          isLastPage: true,
          imgExists: false,
          svgExists: !!logoSvg,
          innerHTML: lastPage.innerHTML.substring(0, 200),
        };
      }

      const computed = iframe.contentWindow!.getComputedStyle(logoImg);
      const rect = logoImg.getBoundingClientRect();

      return {
        found: true,
        isLastPage: true,
        imgExists: true,
        width: rect.width,
        height: rect.height,
        computedWidth: computed.width,
        computedHeight: computed.height,
        opacity: computed.opacity,
        naturalWidth: logoImg.naturalWidth,
        naturalHeight: logoImg.naturalHeight,
        isVisible: rect.width > 0 && rect.height > 0,
        inlineStyle: logoImg.getAttribute("style"),
      };
    });

    console.log("Last page logo info:", JSON.stringify(logoInfo, null, 2));

    // Take screenshot of last page
    await page.screenshot({
      path: "test-results/logo-last.png",
      fullPage: false,
    });

    // Assertions
    expect(logoInfo).not.toBeNull();
    expect(logoInfo!.found).toBe(true);
    expect(logoInfo!.isVisible).toBe(true);
    // Last page logo should be 56px
    expect(logoInfo!.width).toBeCloseTo(56, 0);
    expect(logoInfo!.height).toBeCloseTo(56, 0);
    expect(parseFloat(logoInfo!.opacity!)).toBeCloseTo(0.75, 1);
  });
});
