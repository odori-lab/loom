import { test, expect } from '@playwright/test'

test.describe('BookPreview - Page Navigation & Content Overflow', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to test preview page (uses mock data, no auth required)
    await page.goto('/test-preview')

    // Wait for the measuring process to complete (mock data triggers measurement)
    await page.waitForFunction(() => {
      const el = document.getElementById('measuring-status')
      return el && el.textContent === 'no'
    }, { timeout: 30_000 })

    // Wait for pages to be generated
    await page.waitForFunction(() => {
      const el = document.getElementById('page-count')
      return el && parseInt(el.textContent || '0') > 0
    }, { timeout: 15_000 })
  })

  test('should render initial spread correctly', async ({ page }) => {
    // Verify debug info is populated
    const pageCount = await page.locator('#page-count').textContent()
    const spreadCount = await page.locator('#spread-count').textContent()
    const selectedCount = await page.locator('#selected-count').textContent()

    console.log(`Pages: ${pageCount}, Spreads: ${spreadCount}, Selected: ${selectedCount}`)

    expect(parseInt(pageCount || '0')).toBeGreaterThan(0)
    expect(parseInt(spreadCount || '0')).toBeGreaterThan(0)

    // Take initial screenshot
    await page.screenshot({ path: 'test-results/01-initial-spread.png', fullPage: true })
  })

  test('should navigate forward through all spreads', async ({ page }) => {
    const spreadCount = parseInt(await page.locator('#spread-count').textContent() || '0')
    console.log(`Total spreads: ${spreadCount}`)

    // Screenshot first spread
    await page.screenshot({ path: 'test-results/02-spread-0.png', fullPage: true })

    // Navigate through each spread using the right arrow button
    for (let i = 1; i < spreadCount; i++) {
      const nextBtn = page.locator('button').filter({ has: page.locator('svg') }).last()

      // Check if the next button is enabled
      const isDisabled = await nextBtn.getAttribute('disabled')
      if (isDisabled !== null) {
        console.log(`Next button disabled at spread ${i - 1}`)
        break
      }

      // Click the right navigation arrow (the one on the right side)
      const rightArrow = page.locator('button.absolute.right-4')
      if (await rightArrow.count() > 0 && !(await rightArrow.isDisabled())) {
        await rightArrow.click()
        // Wait for flip animation to complete
        await page.waitForTimeout(800)
      }

      // Take screenshot of each spread
      await page.screenshot({ path: `test-results/02-spread-${i}.png`, fullPage: true })
    }
  })

  test('should navigate backward correctly', async ({ page }) => {
    // First go forward 3 times
    const rightArrow = page.locator('button.absolute.right-4')
    for (let i = 0; i < 3; i++) {
      if (await rightArrow.count() > 0 && !(await rightArrow.isDisabled())) {
        await rightArrow.click()
        await page.waitForTimeout(800)
      }
    }

    await page.screenshot({ path: 'test-results/03-after-forward-3.png', fullPage: true })

    // Now go backward
    const leftArrow = page.locator('button.absolute.left-4')
    for (let i = 0; i < 3; i++) {
      if (await leftArrow.count() > 0 && !(await leftArrow.isDisabled())) {
        await leftArrow.click()
        await page.waitForTimeout(800)
      }
    }

    await page.screenshot({ path: 'test-results/03-after-backward-3.png', fullPage: true })
  })

  test('should handle slider navigation', async ({ page }) => {
    const spreadCount = parseInt(await page.locator('#spread-count').textContent() || '0')

    // Find the range slider
    const slider = page.locator('input[type="range"]')
    if (await slider.count() > 0) {
      // Jump to middle spread
      const midSpread = Math.floor(spreadCount / 2)
      await slider.fill(String(midSpread))
      await page.waitForTimeout(500)
      await page.screenshot({ path: 'test-results/04-slider-middle.png', fullPage: true })

      // Jump to last spread
      await slider.fill(String(spreadCount - 1))
      await page.waitForTimeout(500)
      await page.screenshot({ path: 'test-results/04-slider-last.png', fullPage: true })

      // Jump back to first spread
      await slider.fill('0')
      await page.waitForTimeout(500)
      await page.screenshot({ path: 'test-results/04-slider-first.png', fullPage: true })
    }
  })

  test('should check iframe content for overflow', async ({ page }) => {
    const spreadCount = parseInt(await page.locator('#spread-count').textContent() || '0')
    console.log(`Checking ${spreadCount} spreads for content overflow...`)

    const overflowIssues: string[] = []

    // Check spread 0 first
    async function checkCurrentSpreadOverflow(spreadIdx: number) {
      const iframeElements = page.locator('iframe[title="Page preview"]')
      const iframeCount = await iframeElements.count()

      for (let j = 0; j < iframeCount; j++) {
        const overflowResult = await page.evaluate(async (idx) => {
          const iframes = document.querySelectorAll('iframe[title="Page preview"]')
          const iframe = iframes[idx] as HTMLIFrameElement
          if (!iframe || !iframe.contentDocument) return null

          const body = iframe.contentDocument.body
          const pageDiv = body.querySelector('.page') || body
          const scrollHeight = pageDiv.scrollHeight
          const clientHeight = pageDiv.clientHeight
          const hasOverflow = scrollHeight > clientHeight + 5 // 5px tolerance

          return {
            scrollHeight,
            clientHeight,
            hasOverflow,
            bodyScrollHeight: body.scrollHeight,
            bodyClientHeight: body.clientHeight,
          }
        }, j).catch(() => null)

        if (overflowResult?.hasOverflow) {
          const msg = `Spread ${spreadIdx}, page ${j}: scrollHeight=${overflowResult.scrollHeight} > clientHeight=${overflowResult.clientHeight} (body: ${overflowResult.bodyScrollHeight}/${overflowResult.bodyClientHeight})`
          overflowIssues.push(msg)
          console.log(`  OVERFLOW: ${msg}`)

          await page.screenshot({
            path: `test-results/05-overflow-spread${spreadIdx}-page${j}.png`,
            fullPage: true,
          })
        }
      }
    }

    // Check spread 0
    await checkCurrentSpreadOverflow(0)

    // Navigate forward through all spreads using arrow key
    for (let i = 1; i < spreadCount; i++) {
      const rightArrow = page.locator('button.absolute.right-4')
      if (await rightArrow.count() > 0 && !(await rightArrow.isDisabled())) {
        await rightArrow.click()
        await page.waitForTimeout(800) // wait for flip animation
      } else {
        console.log(`  Cannot advance beyond spread ${i - 1}`)
        break
      }

      await checkCurrentSpreadOverflow(i)
    }

    if (overflowIssues.length > 0) {
      console.log('\n=== OVERFLOW ISSUES FOUND ===')
      overflowIssues.forEach(issue => console.log(`  - ${issue}`))
      console.log(`Total: ${overflowIssues.length} overflowing pages`)
    } else {
      console.log('No overflow issues detected.')
    }
  })

  test('should test keyboard navigation', async ({ page }) => {
    // Focus the page
    await page.click('body')

    // Navigate forward with arrow keys
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(800)
    await page.screenshot({ path: 'test-results/06-keyboard-right.png', fullPage: true })

    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(800)
    await page.screenshot({ path: 'test-results/06-keyboard-right-2.png', fullPage: true })

    // Navigate backward
    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(800)
    await page.screenshot({ path: 'test-results/06-keyboard-left.png', fullPage: true })
  })

  test('should verify page count matches spread structure', async ({ page }) => {
    const pageCount = parseInt(await page.locator('#page-count').textContent() || '0')
    const spreadCount = parseInt(await page.locator('#spread-count').textContent() || '0')

    console.log(`Pages: ${pageCount}, Spreads: ${spreadCount}`)

    // Verify spread count makes sense:
    // - 1 spread for cover (right only)
    // - Math.ceil((pageCount - 2) / 2) spreads for content pages
    // - 1 spread for last page (left only)
    // So total should be: 1 + Math.ceil((pageCount - 2) / 2) + 1
    const expectedSpreads = 1 + Math.ceil(Math.max(0, pageCount - 2) / 2) + 1
    console.log(`Expected spreads: ${expectedSpreads}`)

    // Allow some flexibility due to blank page insertion
    expect(spreadCount).toBeGreaterThanOrEqual(expectedSpreads - 1)
    expect(spreadCount).toBeLessThanOrEqual(expectedSpreads + 1)

    await page.screenshot({ path: 'test-results/07-page-spread-verification.png', fullPage: true })
  })
})
