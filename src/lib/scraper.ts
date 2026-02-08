import { ThreadsPost, ThreadsProfile } from '@/types/threads'
import { chromium } from 'playwright'

interface ScrapeResult {
  posts: ThreadsPost[]
  profile: ThreadsProfile
  hasMore: boolean
}

interface ScrapeOptions {
  limit?: number
  cursor?: string
}

let browserInstance: any = null

async function getBrowser() {
  if (browserInstance) {
    return browserInstance
  }

  const isLocal = process.env.NODE_ENV === 'development'
  const debug = process.env.SCRAPER_DEBUG === 'true'

  if (isLocal) {
    // Local development - use installed Chrome
    browserInstance = await chromium.launch({
      headless: !debug, // Show browser in debug mode
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled', // Hide automation
        '--disable-features=IsolateOrigins,site-per-process',
      ],
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    })
  } else {
    // Production (Vercel) - use bundled chromium
    browserInstance = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled', // Hide automation
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    })
  }

  return browserInstance
}

export async function scrapeThreads(
  username: string,
  options: ScrapeOptions = {}
): Promise<ScrapeResult> {
  const threadsUsername = process.env.THREADS_USERNAME
  const threadsPassword = process.env.THREADS_PASSWORD

  if (!threadsUsername || !threadsPassword) {
    throw new Error('THREADS_USERNAME and THREADS_PASSWORD environment variables are required')
  }

  const browser = await getBrowser()
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    // Add extra headers to appear more like a real browser
    // Note: Removed Upgrade-Insecure-Requests to avoid CORS issues
    extraHTTPHeaders: {
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
    },
    // Disable automation indicators
    ignoreHTTPSErrors: true,
  })
  
  // Add script to hide webdriver property
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    })
    
    // Override permissions
    const originalQuery = window.navigator.permissions.query
    window.navigator.permissions.query = (parameters) =>
      parameters.name === 'notifications'
        ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
        : originalQuery(parameters)
    
    // Mock plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    })
    
    // Mock languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['ko-KR', 'ko', 'en-US', 'en'],
    })
  })
  
  const page = await context.newPage()
  
  // Set extra headers for the page
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
  })
  
  // Remove webdriver property from page
  await page.addInitScript(() => {
    // @ts-ignore
    delete window.navigator.__proto__.webdriver
  })
  
  // Intercept and modify network requests to add required headers
  await page.route('**/*', async (route: any) => {
    const request = route.request()
    const headers = {
      ...request.headers(),
    }
    
    // Add CSRF token if available
    const cookies = await context.cookies()
    const csrfCookie = cookies.find((c: any) => c.name === 'csrftoken')
    if (csrfCookie && request.url().includes('/api/')) {
      headers['X-CSRFToken'] = csrfCookie.value
      headers['X-Requested-With'] = 'XMLHttpRequest'
      headers['X-IG-App-ID'] = '238260118697367'
      headers['X-Instagram-AJAX'] = '1'
    }
    
    await route.continue({ headers })
  })

  try {
    // Navigate to Threads login
    console.log('[SCRAPER] Navigating to Threads login...')
    await page.goto('https://www.threads.net/login', {
      waitUntil: 'networkidle',
      timeout: 30000,
    })

    // Wait for page to fully render
    await page.waitForTimeout(2000)

    // Debug: Take screenshot and log page structure
    if (process.env.SCRAPER_DEBUG === 'true') {
      await page.screenshot({ path: 'debug-login-page.png', fullPage: true })
      const html = await page.content()
      console.log('[DEBUG] Login page HTML length:', html.length)

      // Log all clickable elements
      const clickables = await page.$$eval('button, div[role="button"], [type="submit"]', (els: any[]) =>
        els.map((el: any) => ({
          tag: el.tagName,
          text: el.textContent?.trim().slice(0, 50),
          type: el.getAttribute('type'),
          role: el.getAttribute('role'),
          className: el.className,
        }))
      )
      console.log('[DEBUG] All clickable elements:', JSON.stringify(clickables, null, 2))
    }

    // Fill credentials directly on Threads login page (no Instagram button click needed)
    console.log('[SCRAPER] Waiting for Threads login form...')
    
    // Wait for inputs to appear
    await page.waitForSelector('input[type="text"], input[placeholder*="사용자"], input[placeholder*="username"]', { timeout: 10000 })

    // Debug: Log all inputs on page
    if (process.env.SCRAPER_DEBUG === 'true') {
      const allInputsDebug = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('input')).map((el, idx) => ({
          index: idx,
          type: el.getAttribute('type'),
          name: el.getAttribute('name'),
          id: el.id,
          placeholder: el.getAttribute('placeholder'),
          ariaLabel: el.getAttribute('aria-label'),
          className: el.className.slice(0, 100),
        }))
      })
      console.log('[SCRAPER] All inputs on page:', JSON.stringify(allInputsDebug, null, 2))
    }

    // Try multiple methods to find and fill inputs
    let filled = false

    // Method 1: Find by name attribute (most reliable for Instagram)
    try {
      const usernameInput = page.locator('input[name="username"]').first()
      const passwordInput = page.locator('input[name="password"]').first()
      
      if (await usernameInput.isVisible({ timeout: 3000 }) && await passwordInput.isVisible({ timeout: 3000 })) {
        await usernameInput.fill(threadsUsername)
        console.log('[SCRAPER] ✓ Username filled (by name="username")')
        await page.waitForTimeout(500)
        await passwordInput.fill(threadsPassword)
        console.log('[SCRAPER] ✓ Password filled (by name="password")')
        filled = true
      }
    } catch (e: unknown) {
      console.log(`[SCRAPER] Method 1 failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }

    // Method 2: Find by form inputs (preferred for Threads)
    if (!filled) {
      try {
        const form = await page.locator('form').first()
        const formInputs = await form.locator('input[type="text"], input[type="password"]').all()
        console.log(`[SCRAPER] Found ${formInputs.length} inputs in form`)
        
        if (formInputs.length >= 2) {
          // First input is username, second is password
          await formInputs[0].fill(threadsUsername)
          console.log('[SCRAPER] ✓ Username filled (form input[0])')
          await page.waitForTimeout(500)
          await formInputs[1].fill(threadsPassword)
          console.log('[SCRAPER] ✓ Password filled (form input[1])')
          filled = true
        }
      } catch (e: unknown) {
        console.log(`[SCRAPER] Method 2 failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
      }
    }

    // Method 3: Find by type and order
    if (!filled) {
      try {
        const textInputs = await page.locator('input[type="text"]').all()
        const passwordInputs = await page.locator('input[type="password"]').all()
        
        console.log(`[SCRAPER] Found ${textInputs.length} text inputs, ${passwordInputs.length} password inputs`)
        
        if (textInputs.length > 0 && passwordInputs.length > 0) {
          await textInputs[0].fill(threadsUsername)
          console.log('[SCRAPER] ✓ Username filled (first text input)')
          await page.waitForTimeout(500)
          await passwordInputs[0].fill(threadsPassword)
          console.log('[SCRAPER] ✓ Password filled (first password input)')
          filled = true
        }
      } catch (e: unknown) {
        console.log(`[SCRAPER] Method 3 failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
      }
    }

    // Method 4: Find all inputs and fill by order
    if (!filled) {
      try {
        const allInputs = await page.locator('input').all()
        console.log(`[SCRAPER] Found ${allInputs.length} total inputs`)
        
        // Filter out hidden inputs
        const visibleInputs = []
        for (const input of allInputs) {
          const isVisible = await input.isVisible()
          const inputType = await input.getAttribute('type')
          if (isVisible && inputType !== 'hidden' && inputType !== 'submit') {
            visibleInputs.push(input)
          }
        }
        
        console.log(`[SCRAPER] Found ${visibleInputs.length} visible inputs`)
        
        if (visibleInputs.length >= 2) {
          const firstType = await visibleInputs[0].getAttribute('type')
          const secondType = await visibleInputs[1].getAttribute('type')
          
          if (firstType === 'text' && secondType === 'password') {
            await visibleInputs[0].fill(threadsUsername)
            console.log('[SCRAPER] ✓ Username filled (visible input[0])')
            await page.waitForTimeout(500)
            await visibleInputs[1].fill(threadsPassword)
            console.log('[SCRAPER] ✓ Password filled (visible input[1])')
            filled = true
          }
        }
      } catch (e: unknown) {
        console.log(`[SCRAPER] Method 4 failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
      }
    }

    if (!filled) {
      throw new Error('Could not find or fill username/password inputs')
    }

    // Verify inputs were filled
    if (process.env.SCRAPER_DEBUG === 'true') {
      const filledValues = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input'))
        return inputs.map((el, idx) => ({
          index: idx,
          type: el.getAttribute('type'),
          name: el.getAttribute('name'),
          value: (el as HTMLInputElement).value.slice(0, 20), // First 20 chars only
        }))
      })
      console.log('[SCRAPER] Input values after filling:', JSON.stringify(filledValues, null, 2))
    }

    if (process.env.SCRAPER_DEBUG === 'true') {
      await page.screenshot({ path: 'debug-filled-form.png', fullPage: true })
    }

    // Find and click login button
    console.log('[SCRAPER] Looking for login button...')
    
    // Wait a bit longer to ensure page is fully loaded and scripts are ready
    await page.waitForTimeout(2000)
    
    // Get CSRF token from cookies before login
    const cookiesBefore = await context.cookies()
    const csrfCookie = cookiesBefore.find((c: any) => c.name === 'csrftoken')
    console.log(`[SCRAPER] Cookies before login: ${cookiesBefore.length}`)
    if (csrfCookie) {
      console.log(`[SCRAPER] CSRF token found: ${csrfCookie.value.slice(0, 20)}...`)
    }

    // Get form again (in case it was lost)
    const form = await page.locator('form').first()

    // Try multiple methods to click login
    let clicked = false
    let clickMethod = ''

    // Method 1: Form submit button
    try {
      const submitBtn = form.locator('button[type="submit"]').first()
      if (await submitBtn.isVisible({ timeout: 3000 })) {
        const btnText = await submitBtn.textContent()
        console.log(`[SCRAPER] Found submit button: "${btnText?.trim()}"`)
        await submitBtn.click()
        clicked = true
        clickMethod = 'form submit'
        console.log('[SCRAPER] ✓ Clicked login button (method 1: form submit)')
      }
    } catch (e: unknown) {
      console.log(`[SCRAPER] Method 1 failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }

    // Method 2: Form div button
    if (!clicked) {
      try {
        const formButton = form.locator('div[role="button"]').first()
        if (await formButton.isVisible({ timeout: 3000 })) {
          const btnText = await formButton.textContent()
          console.log(`[SCRAPER] Found form div button: "${btnText?.trim()}"`)
          await formButton.click()
          clicked = true
          clickMethod = 'form div button'
          console.log('[SCRAPER] ✓ Clicked login button (method 2: form div button)')
        }
      } catch (e: unknown) {
        console.log(`[SCRAPER] Method 2 failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
      }
    }

    // Method 3: Text-based locator
    if (!clicked) {
      try {
        const loginButton = page.locator('button:has-text("로그인"), div[role="button"]:has-text("로그인"), button:has-text("Log in"), div[role="button"]:has-text("Log in")').first()
        if (await loginButton.isVisible({ timeout: 3000 })) {
          const btnText = await loginButton.textContent()
          console.log(`[SCRAPER] Found text-based button: "${btnText?.trim()}"`)
          await loginButton.click()
          clicked = true
          clickMethod = 'text-based'
          console.log('[SCRAPER] ✓ Clicked login button (method 3: text-based)')
        }
      } catch (e: any) {
        console.log(`[SCRAPER] Method 3 failed: ${e?.message || 'Unknown error'}`)
      }
    }

    // Method 4: Press Enter on password field
    if (!clicked) {
      try {
        await page.locator('input[type="password"]').press('Enter')
        clicked = true
        clickMethod = 'Enter key'
        console.log('[SCRAPER] ✓ Pressed Enter on password field (method 4)')
      } catch (e: any) {
        console.log(`[SCRAPER] Method 4 failed: ${e?.message || 'Unknown error'}`)
      }
    }

    if (!clicked) {
      // Debug: List all buttons on page
      const allButtons = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('button, div[role="button"]')).map(el => ({
          tag: el.tagName,
          text: el.textContent?.trim().slice(0, 50),
          type: el.getAttribute('type'),
          role: el.getAttribute('role'),
        }))
      })
      console.log('[SCRAPER] All buttons on page:', JSON.stringify(allButtons, null, 2))
      throw new Error('Could not find or click login button')
    }

    console.log(`[SCRAPER] Login button clicked using method: ${clickMethod}`)
    
    // Monitor network requests to see if login API is called and what status it returns
    let loginApiStatus: number | null = null
    const responseHandler = (response: any) => {
      const url = response.url()
      if (url.includes('/api/v1/web/accounts/login/ajax/')) {
        loginApiStatus = response.status()
        console.log(`[SCRAPER] Login API response: ${loginApiStatus} ${response.statusText()}`)
        if (loginApiStatus === 403) {
          console.log('[SCRAPER] ⚠️  403 Forbidden - login request blocked by server')
        } else if (loginApiStatus === 200) {
          console.log('[SCRAPER] ✓ Login API returned 200 - login successful')
        }
      }
    }
    page.on('response', responseHandler)
    
    // Wait for login request to be sent and processed
    await page.waitForTimeout(3000)
    
    // Remove handler after checking
    page.off('response', responseHandler)
    
    if (loginApiStatus === 403) {
      console.log('[SCRAPER] ⚠️  Login API returned 403 - request was blocked')
      console.log('[SCRAPER] This may be due to:')
      console.log('[SCRAPER]   1. Too many login attempts - account temporarily blocked')
      console.log('[SCRAPER]   2. Bot detection - automated login detected')
      console.log('[SCRAPER]   3. IP-based rate limiting')
      console.log('[SCRAPER]')
      console.log('[SCRAPER] 💡 Solution: Wait 1-2 hours before retrying, or try a different account')
    }

    console.log('[SCRAPER] Waiting for login to complete and redirect to Threads...')
    
    // Wait for redirect to Threads (threads.net or threads.com, not login page)
    // This is critical - we must wait for redirect before proceeding
    let redirected = false
    try {
      // waitForURL accepts a string pattern or a function that receives URL object
      await page.waitForURL((url: URL) => {
        const urlString = url.toString()
        const isThreads = urlString.includes('threads.net') || urlString.includes('threads.com')
        const isNotLogin = !urlString.includes('/login')
        return isThreads && isNotLogin
      }, { timeout: 20000 })
      
      const redirectedUrl = page.url()
      console.log(`[SCRAPER] ✓ Redirected to Threads: ${redirectedUrl}`)
      redirected = true
    } catch (e: any) {
      const currentUrl = page.url()
      console.log(`[SCRAPER] ⚠️  Redirect timeout: ${e?.message || 'Unknown error'}`)
      console.log(`[SCRAPER] Current URL: ${currentUrl}`)
      
      // If still on login page after timeout, login likely failed
      if (currentUrl.includes('/login')) {
        // If we got 403, provide more specific error message
        if (loginApiStatus === 403) {
          throw new Error(
            `Login failed - 403 Forbidden. ` +
            `Your account may be temporarily blocked due to too many login attempts. ` +
            `Please wait 1-2 hours before retrying, or try using a different account. ` +
            `URL: ${currentUrl}`
          )
        }
        throw new Error(`Login failed - still on login page after timeout. URL: ${currentUrl}`)
      }
    }

    // Double-check we're not on login page
    const finalUrl = page.url()
    if (finalUrl.includes('/login')) {
      throw new Error(`Login failed - still on login page. URL: ${finalUrl}`)
    }

    // Wait a bit for page to stabilize
    await page.waitForTimeout(2000)

    // Check if login was successful by checking cookies and page content
    const currentUrl = page.url()
    console.log(`[SCRAPER] Current URL after wait: ${currentUrl}`)

    // Check cookies for session indicators
    const cookiesAfter = await context.cookies()
    const cookieNames = cookiesAfter.map((c: any) => c.name)
    console.log(`[SCRAPER] Cookies after login: ${cookiesAfter.length}`)
    console.log(`[SCRAPER] Cookie names: ${cookieNames.join(', ')}`)
    
    const hasSessionCookie = cookiesAfter.some((cookie: any) => 
      cookie.name.includes('sessionid') || 
      cookie.name.includes('csrftoken') ||
      cookie.name.includes('ds_user_id') ||
      cookie.name.includes('mid') ||
      cookie.domain.includes('threads.net') ||
      cookie.domain.includes('instagram.com')
    )
    console.log(`[SCRAPER] Session cookies found: ${hasSessionCookie}`)

    // Check if we're still on login page or redirected to Threads
    const isStillOnLoginPage = currentUrl.includes('/login')
    const isOnThreads = currentUrl.includes('threads.net') || currentUrl.includes('threads.com')
    
    const loginCheck = await page.evaluate(() => {
      const bodyText = document.body.textContent || ''
      const title = document.title
      return {
        title: title,
        hasLoginButton: bodyText.includes('사용자 이름으로 로그인') || bodyText.includes('Log in'),
        hasInstagramLogin: bodyText.includes('Instagram으로 로그인'),
        hasProfileLink: bodyText.includes('프로필') || bodyText.includes('Profile'),
        hasHomeLink: bodyText.includes('홈') || bodyText.includes('Home'),
        bodyTextLength: bodyText.length,
      }
    })
    console.log(`[SCRAPER] Page title: ${loginCheck.title}`)
    console.log(`[SCRAPER] Login check:`, loginCheck)

    // Check if login was successful: redirected to Threads AND not on login page
    // If we got here, redirected should be true (or we would have thrown an error)
    const isLoggedIn = redirected && isOnThreads && !isStillOnLoginPage && hasSessionCookie

    // If still on login page AND no session cookies, login definitely failed
    if (!isLoggedIn) {
      console.log('[SCRAPER] ❌ Login failed - checking details...')
      console.log(`[SCRAPER]    Redirected: ${redirected}`)
      console.log(`[SCRAPER]    On Threads: ${isOnThreads}`)
      console.log(`[SCRAPER]    Still on login page: ${isStillOnLoginPage}`)
      console.log(`[SCRAPER]    Has session cookies: ${hasSessionCookie}`)
      console.log(`[SCRAPER]    Cookies before: ${cookiesBefore.length}, after: ${cookiesAfter.length}`)
      
      // Check if cookies changed
      const newCookies = cookiesAfter.filter((c: any) => !cookiesBefore.some((b: any) => b.name === c.name && b.value === c.value))
      console.log(`[SCRAPER]    New cookies: ${newCookies.length}`)
      if (newCookies.length > 0) {
        console.log(`[SCRAPER]    New cookie names: ${newCookies.map((c: any) => c.name).join(', ')}`)
      }
      
      // Try to see if there's an error message
      const errorText = await page.evaluate(() => {
        const errorEls = Array.from(document.querySelectorAll('div, span, p, [role="alert"]')).filter(el => {
          const text = el.textContent || ''
          const ariaLabel = el.getAttribute('aria-label') || ''
          return text.includes('틀렸') || text.includes('incorrect') || text.includes('잘못') || 
                 text.includes('error') || text.includes('Error') ||
                 ariaLabel.includes('error') || ariaLabel.includes('틀렸')
        })
        return errorEls.map(el => ({
          text: el.textContent?.trim().slice(0, 150),
          ariaLabel: el.getAttribute('aria-label'),
        }))
      })
      if (errorText.length > 0) {
        console.log(`[SCRAPER]    Error messages found:`, JSON.stringify(errorText, null, 2))
      }
      
      if (process.env.SCRAPER_DEBUG === 'true') {
        await page.screenshot({ path: 'debug-login-failed.png', fullPage: true })
        console.log('[SCRAPER] Screenshot saved: debug-login-failed.png')
      }
      
      // If we got 403, provide specific error message about account blocking
      if (loginApiStatus === 403) {
        throw new Error(
          `Login failed - 403 Forbidden. ` +
          `Your account may be temporarily blocked due to too many login attempts. ` +
          `Please wait 1-2 hours before retrying, or try using a different account.`
        )
      }
      
      throw new Error('Login failed - authentication not successful. Check credentials or 2FA requirements.')
    } else {
      console.log('[SCRAPER] ✅ Login appears successful')
    }

    // Wait for redirect to Threads after login - use event-based waiting instead of timeout
    console.log('[SCRAPER] Waiting for redirect to Threads...')
    
    // Set up navigation listener to detect when we're redirected to Threads
    const navigationPromise = page.waitForURL(
      (url: URL) => url.toString().includes('threads.net') || url.toString().includes('threads.com'),
      { timeout: 30000 }
    ).catch(() => null)

    // Check if we're on Instagram's "save login info" page
    const currentUrlAfterLogin = page.url()
    const isOnSaveLoginPage = currentUrlAfterLogin.includes('onetap') || currentUrlAfterLogin.includes('accounts/onetap')
    
    if (isOnSaveLoginPage) {
      console.log('[SCRAPER] Detected Instagram save login info page, looking for save button...')
      
      // Wait a bit for the page to fully render
      await page.waitForTimeout(2000)
      
      // Try multiple selectors for save button
      let saveButtonClicked = false
      
      // Method 1: Korean "저장하기"
      try {
        const saveButton = page.locator('button:has-text("저장하기"), div[role="button"]:has-text("저장하기")').first()
        if (await saveButton.isVisible({ timeout: 3000 })) {
          await saveButton.click()
          saveButtonClicked = true
          console.log('[SCRAPER] ✓ Clicked "저장하기" button (Korean)')
        }
      } catch (e) {
        // Continue to next method
      }
      
      // Method 2: English "Save"
      if (!saveButtonClicked) {
        try {
          const saveButton = page.locator('button:has-text("Save"), div[role="button"]:has-text("Save")').first()
          if (await saveButton.isVisible({ timeout: 3000 })) {
            await saveButton.click()
            saveButtonClicked = true
            console.log('[SCRAPER] ✓ Clicked "Save" button (English)')
          }
        } catch (e) {
          // Continue to next method
        }
      }
      
      // Method 3: Find button by checking page text
      if (!saveButtonClicked) {
        try {
          const pageText = await page.textContent('body')
          if (pageText?.includes('저장') || pageText?.includes('Save')) {
            // Find all buttons and look for save-related ones
            const allButtons = await page.locator('button, div[role="button"]').all()
            for (const btn of allButtons) {
              const btnText = await btn.textContent()
              if (btnText && (btnText.includes('저장') || btnText.includes('Save'))) {
                await btn.click()
                saveButtonClicked = true
                console.log(`[SCRAPER] ✓ Clicked save button found by text: "${btnText.trim()}"`)
                break
              }
            }
          }
        } catch (e: unknown) {
          console.log(`[SCRAPER] Method 3 failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
        }
      }
      
      if (saveButtonClicked) {
        // Wait for redirect after saving - but don't wait too long
        try {
          await page.waitForURL((url: URL) => !url.toString().includes('onetap'), { timeout: 10000 })
          console.log('[SCRAPER] ✓ Redirected after saving login info')
        } catch (e: unknown) {
          console.log('[SCRAPER] ⚠️  Still on save login page after click')
        }
      } else {
        console.log('[SCRAPER] ⚠️  Could not find save button, but continuing anyway...')
      }
    }

    // Wait for redirect to Threads - event-based instead of timeout
    const urlAfterSave = page.url()
    if (urlAfterSave.includes('instagram.com') && !urlAfterSave.includes('threads')) {
      console.log('[SCRAPER] Still on Instagram, waiting for automatic redirect to Threads...')
      
      try {
        // Wait for navigation to Threads (this will be triggered by Instagram's redirect)
        await navigationPromise
        const newUrl = page.url()
        console.log(`[SCRAPER] ✓ Redirected to: ${newUrl}`)
        
        // Wait for Threads page to load
        await page.waitForLoadState('domcontentloaded', { timeout: 15000 })
        console.log('[SCRAPER] ✓ Threads page loaded')
        
        // Wait a bit more for session cookies to be set
        await page.waitForTimeout(3000)
        
        // Verify Threads session cookies are present
        const threadsCookies = await context.cookies()
        const hasThreadsSession = threadsCookies.some((cookie: any) => 
          (cookie.name.includes('sessionid') || cookie.name.includes('ds_user_id')) &&
          (cookie.domain.includes('threads.net') || cookie.domain.includes('threads.com'))
        )
        
        if (!hasThreadsSession) {
          console.log('[SCRAPER] ⚠️  No Threads session cookies found after redirect, waiting more...')
          await page.waitForTimeout(5000)
          
          // Check again
          const threadsCookies2 = await context.cookies()
          const hasThreadsSession2 = threadsCookies2.some((cookie: any) => 
            (cookie.name.includes('sessionid') || cookie.name.includes('ds_user_id')) &&
            (cookie.domain.includes('threads.net') || cookie.domain.includes('threads.com'))
          )
          
          if (!hasThreadsSession2) {
            console.log('[SCRAPER] ⚠️  Still no Threads session cookies - may need to refresh or re-login')
          } else {
            console.log('[SCRAPER] ✓ Threads session cookies found after additional wait')
          }
        } else {
          console.log('[SCRAPER] ✓ Threads session cookies verified')
        }
      } catch (e: unknown) {
        console.log(`[SCRAPER] ⚠️  Automatic redirect didn't happen: ${e instanceof Error ? e.message : 'Unknown error'}`)
        console.log('[SCRAPER] Manually navigating to Threads...')
        
        // Fallback: manually navigate to Threads
        try {
          await page.goto('https://www.threads.net', {
            waitUntil: 'domcontentloaded',
            timeout: 20000,
          })
          await page.waitForLoadState('domcontentloaded', { timeout: 10000 })
          await page.waitForTimeout(3000)
          console.log('[SCRAPER] ✓ Manually navigated to Threads')
        } catch (navError: unknown) {
          console.log(`[SCRAPER] ⚠️  Could not navigate to Threads: ${navError instanceof Error ? navError.message : 'Unknown error'}`)
        }
      }
    } else if (urlAfterSave.includes('threads')) {
      console.log('[SCRAPER] ✓ Already on Threads, waiting for page to stabilize...')
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 })
      await page.waitForTimeout(3000)
      
      // Verify Threads session cookies
      const threadsCookies = await context.cookies()
      const hasThreadsSession = threadsCookies.some((cookie: any) => 
        (cookie.name.includes('sessionid') || cookie.name.includes('ds_user_id')) &&
        (cookie.domain.includes('threads.net') || cookie.domain.includes('threads.com'))
      )
      console.log(`[SCRAPER] Threads session cookies present: ${hasThreadsSession}`)
    } else {
      // Unknown state, wait a bit
      await page.waitForTimeout(2000)
    }

    // Navigate to user profile
    console.log(`[SCRAPER] Navigating to @${username} profile...`)
    await page.goto(`https://www.threads.net/@${username}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    })

    // Wait longer for profile to fully load
    await page.waitForTimeout(5000)

    // Check if we're logged in on profile page - strict check for infinite scroll capability
    const profileLoginCheck = await page.evaluate(() => {
      const bodyText = document.body.textContent || ''
      
      // Check for logged-in indicators (required for infinite scroll)
      // Note: Can't use Playwright selectors like :has-text() in page.evaluate()
      const hasProfileMenu = document.querySelector('a[href*="/me"], a[href*="/profile"]') !== null
      
      // Check for create button by checking all buttons and links
      let hasCreateButton = false
      const allButtons = Array.from(document.querySelectorAll('button, a'))
      for (const btn of allButtons) {
        const text = btn.textContent?.trim() || ''
        const ariaLabel = btn.getAttribute('aria-label') || ''
        if (text.includes('만들기') || text.includes('Create') || ariaLabel.includes('만들기') || ariaLabel.includes('Create')) {
          hasCreateButton = true
          break
        }
      }
      
      // Check for notifications button
      let hasNotifications = false
      const notificationButtons = Array.from(document.querySelectorAll('button[aria-label*="알림"], button[aria-label*="Notification"]'))
      hasNotifications = notificationButtons.length > 0
      
      const hasHomeLink = document.querySelector('a[href="/"], a[href="/home"]') !== null
      
      // Check for login prompts
      const hasLoginPrompt = bodyText.includes('사용자 이름으로 로그인') || 
                            bodyText.includes('Log in with username') ||
                            bodyText.includes('Instagram으로 로그인')
      
      // Check if we can see posts
      const hasPosts = document.querySelectorAll('time').length > 0
      const hasProfileName = document.querySelector('h1') !== null
      
      // Check for "로그인" link in navigation (indicates not logged in)
      const loginLinks = Array.from(document.querySelectorAll('a')).filter(a => {
        const text = a.textContent?.trim() || ''
        return text === '로그인' || text === 'Log in'
      })
      const hasLoginLink = loginLinks.length > 0
      
      return {
        hasLoginPrompt: hasLoginPrompt,
        hasLoginLink: hasLoginLink,
        hasProfileMenu: hasProfileMenu,
        hasCreateButton: hasCreateButton,
        hasNotifications: hasNotifications,
        hasHomeLink: hasHomeLink,
        hasPosts: hasPosts,
        hasProfileName: hasProfileName,
        // Must have at least one logged-in indicator for infinite scroll
        isLoggedIn: hasProfileMenu || hasCreateButton || hasNotifications || hasHomeLink,
      }
    })
    console.log(`[SCRAPER] Profile page login check:`, profileLoginCheck)

    // Double-check cookies on profile page - specifically Threads session cookies
    const profileCookies = await context.cookies()
    const threadsSessionCookies = profileCookies.filter((cookie: any) => 
      (cookie.name.includes('sessionid') || cookie.name.includes('ds_user_id')) &&
      (cookie.domain.includes('threads.net') || cookie.domain.includes('threads.com'))
    )
    const hasThreadsSessionCookie = threadsSessionCookies.length > 0
    console.log(`[SCRAPER] Threads session cookies: ${hasThreadsSessionCookie}`)
    if (threadsSessionCookies.length > 0) {
      console.log(`[SCRAPER] Threads session cookie names: ${threadsSessionCookies.map((c: any) => c.name).join(', ')}`)
    }

    // Strict check: Must be logged in for infinite scroll
    if (!profileLoginCheck.isLoggedIn || hasThreadsSessionCookie === false) {
      const errorMsg = 'Login failed - not logged in to Threads. Authentication required for infinite scroll.'
      console.error(`[SCRAPER] ❌ ${errorMsg}`)
      console.error(`[SCRAPER]    Logged-in indicators: profileMenu=${profileLoginCheck.hasProfileMenu}, createButton=${profileLoginCheck.hasCreateButton}, notifications=${profileLoginCheck.hasNotifications}`)
      console.error(`[SCRAPER]    Threads session cookies: ${hasThreadsSessionCookie}`)
      if (process.env.SCRAPER_DEBUG === 'true') {
        await page.screenshot({ path: 'debug-profile-not-logged-in.png', fullPage: true })
      }
      throw new Error(errorMsg)
    }
    
    if (!profileLoginCheck.hasPosts) {
      console.log('[SCRAPER] ⚠️  No posts found - may need to scroll or wait longer')
    }

    if (!profileLoginCheck.hasPosts) {
      console.log('[SCRAPER] ⚠️  No posts found - may need to scroll or wait longer')
    }

    // Debug: Take profile page screenshot
    if (process.env.SCRAPER_DEBUG === 'true') {
      await page.screenshot({ path: 'debug-profile-page.png', fullPage: true })

      // Log page structure
      const structure = await page.evaluate(() => {
        return {
          h1Count: document.querySelectorAll('h1').length,
          h1Texts: Array.from(document.querySelectorAll('h1')).map(h => h.textContent?.trim().slice(0, 50)),
          spanCount: document.querySelectorAll('span[dir="auto"]').length,
          imgCount: document.querySelectorAll('img').length,
          imgSrcs: Array.from(document.querySelectorAll('img')).slice(0, 5).map(img => (img as HTMLImageElement).src.slice(0, 100)),
          postDivs: document.querySelectorAll('div[role="button"]').length,
          timeElements: document.querySelectorAll('time').length,
        }
      })
      console.log('[DEBUG] Profile page structure:', JSON.stringify(structure, null, 2))
    }

    // Extract profile info
    const profile = await page.evaluate((uname: string) => {
      // Try multiple selectors for display name
      let displayName = uname
      const h1El = document.querySelector('h1')
      if (h1El) {
        displayName = h1El.textContent?.trim() || uname
      }

      // Get all images and find profile image
      const images = Array.from(document.querySelectorAll('img'))
      const profileImg = images.find(img =>
        (img as HTMLImageElement).src.includes('cdninstagram') ||
        (img as HTMLImageElement).src.includes('scontent')
      ) as HTMLImageElement | undefined

      return {
        username: uname,
        displayName: displayName,
        bio: '', // Will extract later if needed
        followerCount: 0, // Will extract later if needed
        profileImageUrl: profileImg?.src || '',
      }
    }, username)

    console.log('[SCRAPER] Profile extracted:', profile)

    // Scroll and collect posts
    const limit = options.limit || 50
    let posts: ThreadsPost[] = []
    let lastHeight = 0
    let scrollAttempts = 0
    const maxScrollAttempts = 10

    console.log(`[SCRAPER] Collecting up to ${limit} posts...`)

    while (posts.length < limit && scrollAttempts < maxScrollAttempts) {
      // Extract posts from current viewport
      const newPosts = await page.evaluate((uname: string) => {
        // Find posts by looking for time elements and their parent containers
        const timeElements = Array.from(document.querySelectorAll('time'))
        const postContainers = new Set<HTMLElement>()

        for (const time of timeElements) {
          // Go up to find a substantial parent container
          let parent = time.parentElement
          for (let i = 0; i < 15 && parent; i++) {
            const rect = parent.getBoundingClientRect()
            const childCount = parent.querySelectorAll('*').length

            // A post container typically has 50+ child elements and 100px+ height
            if (childCount > 50 && rect.height > 100) {
              postContainers.add(parent as HTMLElement)
              break
            }

            parent = parent.parentElement
          }
        }

        const postContainersArray = Array.from(postContainers)

        return postContainersArray.map((container, idx) => {
          // Extract all spans
          const spans = Array.from(container.querySelectorAll('span'))
          const allSpanTexts = spans
            .map((s) => s.textContent?.trim())
            .filter((t) => t && t.length > 0)

          // Get time element
          const timeEl = container.querySelector('time') as HTMLTimeElement | null

          // Find post content - usually the longest span text that's not a username/date
          const meaningfulSpans = allSpanTexts.filter((t) => {
            return (
              t &&
              t.length > 10 &&
              !t.includes('ago') &&
              !t.includes('시간') &&
              !t.includes('인증된') &&
              !t.includes('팔로워') &&
              !t.match(/^\d{4}-\d{2}-\d{2}$/)
            )
          })

          // Get the longest span as content
          let content = ''
          let maxLen = 0
          for (const text of meaningfulSpans) {
            if (text.length > maxLen) {
              content = text
              maxLen = text.length
            }
          }

          // Find images (larger than 100x100)
          const imageEls = Array.from(container.querySelectorAll('img')).filter((img) => {
            const imgEl = img as HTMLImageElement
            return imgEl.width > 100 && imgEl.height > 100
          }).slice(0, 2)

          const imageUrls = imageEls.map((img) => (img as HTMLImageElement).src)

          return {
            id: `${uname}-${Date.now()}-${idx}`,
            username: uname,
            content: content,
            imageUrls: imageUrls,
            likeCount: 0,
            replyCount: 0,
            repostCount: 0,
            postedAt: timeEl?.dateTime || new Date().toISOString(),
          }
        })
      }, username)

      // Add new posts (deduplicate by content)
      const existingContents = new Set(posts.map((p) => p.content))
      const uniqueNewPosts = (newPosts as ThreadsPost[]).filter((p) => p.content && !existingContents.has(p.content))

      posts.push(...uniqueNewPosts)
      console.log(`[SCRAPER] Collected ${posts.length} unique posts so far...`)

      // Scroll down
      await page.evaluate(() => window.scrollBy(0, window.innerHeight))
      await page.waitForTimeout(1500)

      // Check if we've reached the bottom
      const newHeight = await page.evaluate(() => document.body.scrollHeight)
      if (newHeight === lastHeight) {
        scrollAttempts++
      } else {
        scrollAttempts = 0
      }
      lastHeight = newHeight
    }

    // Limit posts and sort by date
    posts = posts.slice(0, limit)
    posts.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime())

    console.log(`[SCRAPER] Successfully collected ${posts.length} posts`)

    return {
      posts,
      profile,
      hasMore: posts.length >= limit,
    }
  } catch (error) {
    console.error('[SCRAPER] Error:', error)
    throw error
  } finally {
    await page.close()
    await context.close()
  }
}

// Close browser on process exit
process.on('exit', async () => {
  if (browserInstance) {
    await browserInstance.close()
    browserInstance = null
  }
})
