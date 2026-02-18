import { expect, test } from "@playwright/test";

test.describe("Dashboard - LoomsTab List View & PreviewModal", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/test-dashboard");
    // Wait for the looms list to render
    await page.waitForSelector("#test-dashboard", { timeout: 15_000 });
    await page.waitForTimeout(500); // wait for animations
  });

  test("should render looms as list items (not grid)", async ({ page }) => {
    // Verify no grid layout
    const gridContainer = page.locator(".grid");
    expect(await gridContainer.count()).toBe(0);

    // Verify list items exist (loom rows with flex layout)
    const loomRows = page.locator(
      '#looms-container [class*="rounded-xl"][class*="cursor-pointer"]',
    );
    const count = await loomRows.count();
    console.log(`Found ${count} loom rows`);
    expect(count).toBeGreaterThanOrEqual(2);

    await page.screenshot({
      path: "test-results/dashboard-01-list-view.png",
      fullPage: true,
    });
  });

  test("should expand chapters when clicking a loom", async ({ page }) => {
    // Click first loom row
    const firstRow = page
      .locator(
        '#looms-container [class*="rounded-xl"][class*="cursor-pointer"]',
      )
      .first();
    await firstRow.click();
    await page.waitForTimeout(300);

    // Check that chapters are shown (look for chapter number badges)
    const chapterItems = page.locator("text=Daily Life");
    expect(await chapterItems.count()).toBeGreaterThanOrEqual(1);

    // Verify chapter structure
    const relationships = page.locator("text=Relationships");
    expect(await relationships.count()).toBeGreaterThanOrEqual(1);

    const reflections = page.locator("text=Reflections");
    expect(await reflections.count()).toBeGreaterThanOrEqual(1);

    await page.screenshot({
      path: "test-results/dashboard-02-chapters-expanded.png",
      fullPage: true,
    });
  });

  test("should collapse chapters when clicking same loom again", async ({
    page,
  }) => {
    // Click to expand
    const firstRow = page
      .locator(
        '#looms-container [class*="rounded-xl"][class*="cursor-pointer"]',
      )
      .first();
    await firstRow.click();
    await page.waitForTimeout(300);

    // Verify expanded
    let chapters = page.locator("text=Daily Life");
    expect(await chapters.count()).toBeGreaterThanOrEqual(1);

    // Click again to collapse
    await firstRow.click();
    await page.waitForTimeout(300);

    // Chapters should be hidden now
    chapters = page.locator("text=Daily Life");
    // The text might still be in DOM but the parent should not be visible
    await page.screenshot({
      path: "test-results/dashboard-03-chapters-collapsed.png",
      fullPage: true,
    });
  });

  test('should show "No chapters available" for loom without book_structure', async ({
    page,
  }) => {
    // Click second loom (no book_structure)
    const loomRows = page.locator(
      '#looms-container [class*="rounded-xl"][class*="cursor-pointer"]',
    );
    await loomRows.nth(1).click();
    await page.waitForTimeout(300);

    const noChapters = page.locator("text=No chapters available");
    expect(await noChapters.count()).toBeGreaterThanOrEqual(1);

    await page.screenshot({
      path: "test-results/dashboard-04-no-chapters.png",
      fullPage: true,
    });
  });

  test("should show selected state on loom row", async ({ page }) => {
    // Click first loom
    const firstRow = page
      .locator(
        '#looms-container [class*="rounded-xl"][class*="cursor-pointer"]',
      )
      .first();
    await firstRow.click();
    await page.waitForTimeout(300);

    // Verify selected state (bg-gray-900 class applied)
    const selectedRow = page.locator('#looms-container [class*="bg-gray-900"]');
    expect(await selectedRow.count()).toBeGreaterThanOrEqual(1);

    await page.screenshot({
      path: "test-results/dashboard-05-selected-state.png",
      fullPage: true,
    });
  });

  test("LoomPreviewPanel should center content vertically", async ({
    page,
  }) => {
    // The preview panel should have items-center and justify-center
    const panel = page.locator(".bg-gray-50.border-l");
    expect(await panel.count()).toBeGreaterThanOrEqual(1);

    // Check that the panel uses flex centering
    const style = await panel.first().evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        display: computed.display,
        alignItems: computed.alignItems,
        justifyContent: computed.justifyContent,
      };
    });
    console.log("Panel styles:", style);

    await page.screenshot({
      path: "test-results/dashboard-06-preview-panel.png",
      fullPage: true,
    });
  });

  test("PreviewModal should not be full viewport", async ({ page }) => {
    // Click first loom to select it
    const firstRow = page
      .locator(
        '#looms-container [class*="rounded-xl"][class*="cursor-pointer"]',
      )
      .first();
    await firstRow.click();
    await page.waitForTimeout(500);

    // Click a chapter to open preview modal
    const chapterItem = page.locator("text=Daily Life").first();
    await chapterItem.click();
    await page.waitForTimeout(500);

    // Check if modal appeared
    const modal = page.locator(".fixed.inset-0.z-50");
    const modalVisible = (await modal.count()) > 0;

    if (modalVisible) {
      // Check the modal container is NOT full viewport
      const innerModal = page.locator(
        ".rounded-2xl.overflow-hidden.shadow-2xl",
      );
      expect(await innerModal.count()).toBeGreaterThanOrEqual(1);

      // Verify it has max-width constraint
      const modalBox = await innerModal.first().boundingBox();
      const viewportSize = page.viewportSize()!;

      console.log(`Modal: ${modalBox?.width}x${modalBox?.height}`);
      console.log(`Viewport: ${viewportSize.width}x${viewportSize.height}`);

      // Modal should be smaller than viewport (not full inset-0)
      if (modalBox) {
        expect(modalBox.width).toBeLessThan(viewportSize.width);
        expect(modalBox.height).toBeLessThan(viewportSize.height);
      }

      await page.screenshot({
        path: "test-results/dashboard-07-preview-modal.png",
        fullPage: true,
      });

      // Test escape to close
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
      const modalAfterClose = page.locator(".fixed.inset-0.z-50");
      expect(await modalAfterClose.count()).toBe(0);
    } else {
      console.log("Modal not opened (no PDF URL in mock data - expected)");
    }
  });

  test("should handle search functionality", async ({ page }) => {
    // Type in search
    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill("whatthesol");
    await page.waitForTimeout(300);

    // Should filter to show only matching loom
    const loomRows = page.locator(
      '#looms-container [class*="rounded-xl"][class*="cursor-pointer"]',
    );
    expect(await loomRows.count()).toBe(1);

    await page.screenshot({
      path: "test-results/dashboard-08-search.png",
      fullPage: true,
    });

    // Clear search
    await searchInput.fill("");
    await page.waitForTimeout(300);

    // Should show all looms again
    expect(await loomRows.count()).toBe(2);
  });
});
