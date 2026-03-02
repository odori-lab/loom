import type { Browser, BrowserContext } from "playwright";
import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type {
  ScrapeResult,
  ScraperAccount,
  ThreadsPost,
  ThreadsProfile,
} from "./types";

chromium.use(StealthPlugin());

// Session lifetime: 24 hours
const SESSION_LIFETIME = 24 * 60 * 60 * 1000;

class ScraperWorker {
  private browserInstance: Browser | null = null;
  private contextInstance: BrowserContext | null = null;
  private lastLoginTime: number = 0;
  private account: ScraperAccount;
  private taskChain: Promise<void> = Promise.resolve();

  constructor() {
    const username = process.env.THREADS_USERNAME;
    const password = process.env.THREADS_PASSWORD;
    const hasCookies = !!process.env.THREADS_SESSION_COOKIES;

    if (!hasCookies && (!username || !password)) {
      throw new Error(
        "Either THREADS_SESSION_COOKIES or both THREADS_USERNAME and THREADS_PASSWORD are required",
      );
    }

    this.account = {
      id: "default",
      username: username || "",
      password: password || "",
    };
    if (hasCookies) {
      console.log(
        "[SCRAPER] Session cookies configured (will skip login if valid)",
      );
    }
    if (username) {
      console.log(`[SCRAPER] Loaded account: ${username}`);
    }
  }

  /**
   * Main entry point - queued scraping (one at a time)
   */
  async scrapeProfile(
    targetUsername: string,
    limit: number = 50,
    onProgress?: (progress: number, message: string) => void,
  ): Promise<ScrapeResult> {
    return new Promise<ScrapeResult>((resolve) => {
      this.taskChain = this.taskChain.then(async () => {
        const startTime = Date.now();
        console.log(`[SCRAPER] Using account: ${this.account.username}`);

        try {
          const result = await this.doScrape(
            this.account,
            targetUsername,
            limit,
            onProgress,
          );

          resolve({
            success: true,
            profile: result.profile,
            posts: result.posts,
            accountId: this.account.id,
            duration: Date.now() - startTime,
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          console.log(
            `[SCRAPER] Error with account ${this.account.username}: ${errorMessage}`,
          );

          resolve({
            success: false,
            error: errorMessage,
            accountId: this.account.id,
            duration: Date.now() - startTime,
          });
        }
      });
    });
  }

  /**
   * Get or create browser instance
   */
  private async getBrowser(): Promise<Browser> {
    if (this.browserInstance) {
      return this.browserInstance;
    }

    const isDebug = process.env.SCRAPER_DEBUG === "true";
    console.log(`[SCRAPER] Launching browser... (debug: ${isDebug})`);

    this.browserInstance = await chromium.launch({
      headless: !isDebug,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
        "--disable-features=IsolateOrigins,site-per-process",
      ],
    });

    return this.browserInstance;
  }

  /**
   * Create a new browser context with anti-detection measures
   */
  private async createContext(browser: Browser): Promise<BrowserContext> {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      extraHTTPHeaders: {
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
      },
      ignoreHTTPSErrors: true,
    });

    // Add script to hide webdriver property
    await context.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", {
        get: () => false,
      });

      // Override permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) =>
        parameters.name === "notifications"
          ? Promise.resolve({
              state: Notification.permission,
            } as PermissionStatus)
          : originalQuery(parameters);

      // Mock plugins
      Object.defineProperty(navigator, "plugins", {
        get: () => [1, 2, 3, 4, 5],
      });

      // Mock languages
      Object.defineProperty(navigator, "languages", {
        get: () => ["ko-KR", "ko", "en-US", "en"],
      });
    });

    return context;
  }

  /**
   * Check if current session is valid
   */
  private async isSessionValidLocal(context: BrowserContext): Promise<boolean> {
    try {
      const now = Date.now();
      if (now - this.lastLoginTime > SESSION_LIFETIME) {
        console.log("[SCRAPER] Session expired (24h)");
        return false;
      }

      const cookies = await context.cookies();
      const hasThreadsSession = cookies.some(
        (cookie) =>
          (cookie.name.includes("sessionid") ||
            cookie.name.includes("ds_user_id")) &&
          (cookie.domain.includes("threads.net") ||
            cookie.domain.includes("threads.com")),
      );

      return hasThreadsSession;
    } catch (error) {
      console.log("[SCRAPER] Error checking session validity:", error);
      return false;
    }
  }

  /**
   * Perform login to Threads
   */
  private async loginToThreads(
    context: BrowserContext,
    account: ScraperAccount,
  ): Promise<void> {
    const isDebug = process.env.SCRAPER_DEBUG === "true";
    console.log(`[SCRAPER] Starting login for ${account.username}...`);

    const page = await context.newPage();

    // Set extra headers for the page
    await page.setExtraHTTPHeaders({
      "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    });

    // Remove webdriver property from page
    await page.addInitScript(() => {
      // @ts-expect-error
      delete window.navigator.__proto__.webdriver;
    });

    // Intercept and modify network requests to add required headers
    await page.route("**/*", async (route) => {
      const request = route.request();
      const headers = {
        ...request.headers(),
      };

      const cookies = await context.cookies();
      const csrfCookie = cookies.find((c) => c.name === "csrftoken");
      if (csrfCookie && request.url().includes("/api/")) {
        headers["X-CSRFToken"] = csrfCookie.value;
        headers["X-Requested-With"] = "XMLHttpRequest";
        headers["X-IG-App-ID"] = "238260118697367";
        headers["X-Instagram-AJAX"] = "1";
      }

      await route.continue({ headers });
    });

    try {
      // Navigate to Threads login
      console.log("[SCRAPER] Navigating to Threads login...");
      await page.goto("https://www.threads.net/login", {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      await page.waitForTimeout(2000);

      if (isDebug) {
        await page.screenshot({
          path: "/tmp/debug-1-login-page.png",
          fullPage: true,
        });
        console.log("[DEBUG] Screenshot saved: /tmp/debug-1-login-page.png");
      }

      // Wait for inputs to appear
      await page.waitForSelector('input[type="text"], input[name="username"]', {
        timeout: 10000,
      });

      // Try to fill credentials using multiple methods
      let filled = false;

      // Method 1: Find by name attribute
      try {
        const usernameInput = page.locator('input[name="username"]').first();
        const passwordInput = page.locator('input[name="password"]').first();

        if (
          (await usernameInput.isVisible({ timeout: 3000 })) &&
          (await passwordInput.isVisible({ timeout: 3000 }))
        ) {
          await usernameInput.fill(account.username);
          console.log("[SCRAPER] ✓ Username filled");
          await page.waitForTimeout(500);
          await passwordInput.fill(account.password);
          console.log("[SCRAPER] ✓ Password filled");
          filled = true;
        }
      } catch (e) {
        console.log(
          `[SCRAPER] Method 1 failed: ${e instanceof Error ? e.message : "Unknown"}`,
        );
      }

      // Method 2: Find by form inputs
      if (!filled) {
        try {
          const form = page.locator("form").first();
          const formInputs = await form
            .locator('input[type="text"], input[type="password"]')
            .all();
          console.log(`[SCRAPER] Found ${formInputs.length} inputs in form`);

          if (formInputs.length >= 2) {
            await formInputs[0]?.fill(account.username);
            console.log("[SCRAPER] ✓ Username filled (form input[0])");
            await page.waitForTimeout(500);
            await formInputs[1]?.fill(account.password);
            console.log("[SCRAPER] ✓ Password filled (form input[1])");
            filled = true;
          }
        } catch (e) {
          console.log(
            `[SCRAPER] Method 2 failed: ${e instanceof Error ? e.message : "Unknown"}`,
          );
        }
      }

      if (!filled) {
        throw new Error("Could not find or fill username/password inputs");
      }

      if (isDebug) {
        await page.screenshot({
          path: "/tmp/debug-2-filled-form.png",
          fullPage: true,
        });
        console.log("[DEBUG] Screenshot saved: /tmp/debug-2-filled-form.png");
      }

      // Wait before clicking login
      await page.waitForTimeout(2000);

      // Find and click login button
      console.log("[SCRAPER] Looking for login button...");
      let clicked = false;

      // Method 1: Form submit button
      try {
        const form = page.locator("form").first();
        const submitBtn = form.locator('button[type="submit"]').first();
        if (await submitBtn.isVisible({ timeout: 3000 })) {
          await submitBtn.click();
          clicked = true;
          console.log("[SCRAPER] ✓ Clicked login button (form submit)");
        }
      } catch (_e) {
        console.log("[SCRAPER] Form submit button not found");
      }

      // Method 2: Text-based locator
      if (!clicked) {
        try {
          const loginButton = page
            .locator(
              'button:has-text("로그인"), div[role="button"]:has-text("로그인"), button:has-text("Log in")',
            )
            .first();
          if (await loginButton.isVisible({ timeout: 3000 })) {
            await loginButton.click();
            clicked = true;
            console.log("[SCRAPER] ✓ Clicked login button (text-based)");
          }
        } catch (_e) {
          console.log("[SCRAPER] Text-based button not found");
        }
      }

      // Method 3: Press Enter
      if (!clicked) {
        await page.locator('input[type="password"]').press("Enter");
        clicked = true;
        console.log("[SCRAPER] ✓ Pressed Enter on password field");
      }

      // Monitor for login API response
      let loginApiStatus: number | null = null;
      const responseHandler = (response: any) => {
        const url = response.url();
        if (url.includes("/api/v1/web/accounts/login/ajax/")) {
          loginApiStatus = response.status();
          console.log(`[SCRAPER] Login API response: ${loginApiStatus}`);
        }
      };
      page.on("response", responseHandler);

      // Wait for login request
      await page.waitForTimeout(3000);

      if (isDebug) {
        await page.screenshot({
          path: "/tmp/debug-3-after-login-click.png",
          fullPage: true,
        });
        console.log(
          "[DEBUG] Screenshot saved: /tmp/debug-3-after-login-click.png",
        );
        console.log(`[DEBUG] Current URL: ${page.url()}`);
      }

      page.off("response", responseHandler);

      if (loginApiStatus !== null && loginApiStatus >= 400) {
        console.log(
          `[SCRAPER] Login API returned ${loginApiStatus} - waiting for redirect to confirm...`,
        );
      }

      // Wait for redirect to Threads
      console.log("[SCRAPER] Waiting for redirect to Threads...");
      try {
        await page.waitForURL(
          (url) => {
            const urlString = url.toString();
            const isThreads =
              urlString.includes("threads.net") ||
              urlString.includes("threads.com");
            const isNotLogin = !urlString.includes("/login");
            return isThreads && isNotLogin;
          },
          { timeout: 15000 },
        );
        console.log(`[SCRAPER] ✓ Redirected to: ${page.url()}`);
      } catch (_e) {
        const currentUrl = page.url();
        console.log(`[SCRAPER] Redirect timeout, current URL: ${currentUrl}`);

        // If login API succeeded but page didn't redirect, navigate manually
        if (loginApiStatus === 200 && currentUrl.includes("/login")) {
          console.log(
            "[SCRAPER] Login API was 200 but no redirect - navigating manually...",
          );
          await page.goto("https://www.threads.com/", {
            waitUntil: "domcontentloaded",
            timeout: 15000,
          });
          console.log(`[SCRAPER] ✓ Manually navigated to: ${page.url()}`);
        } else if (currentUrl.includes("/login")) {
          if (isDebug) {
            await page.screenshot({
              path: "/tmp/debug-4-login-failed.png",
              fullPage: true,
            });
            console.log(
              "[DEBUG] Screenshot saved: /tmp/debug-4-login-failed.png",
            );
          }
          const apiInfo =
            loginApiStatus !== null ? ` (API status: ${loginApiStatus})` : "";
          throw new Error(
            `Login failed - still on login page after timeout${apiInfo}. Check credentials.`,
          );
        }
      }

      // Detect challenge/verification redirect
      const postLoginUrl = page.url();
      if (
        postLoginUrl.includes("challenge") ||
        postLoginUrl.includes("/checkpoint")
      ) {
        console.log(`[SCRAPER] Challenge/checkpoint detected: ${postLoginUrl}`);
        if (isDebug) {
          await page.screenshot({
            path: "/tmp/debug-4-challenge.png",
            fullPage: true,
          });
          console.log("[DEBUG] Screenshot saved: /tmp/debug-4-challenge.png");
        }
        throw new Error(
          "Login failed - challenge/verification required. Account needs manual verification.",
        );
      }

      // Handle "Save Login Info" page
      const saveLoginUrl = page.url();
      if (
        saveLoginUrl.includes("onetap") ||
        saveLoginUrl.includes("accounts/onetap")
      ) {
        console.log("[SCRAPER] Detected save login info page...");
        try {
          const saveButton = page
            .locator('button:has-text("저장하기"), button:has-text("Save")')
            .first();
          if (await saveButton.isVisible({ timeout: 3000 })) {
            await saveButton.click();
            await page.waitForTimeout(2000);
          }
        } catch (_e) {
          console.log("[SCRAPER] Could not find save button, continuing...");
        }
      }

      // Verify session cookies after login
      const postLoginCookies = await context.cookies();
      const relevantCookies = postLoginCookies.filter(
        (c) =>
          c.domain.includes("threads.net") ||
          c.domain.includes("threads.com") ||
          c.domain.includes("instagram.com"),
      );
      const hasSessionCookie = relevantCookies.some(
        (cookie) =>
          cookie.name.includes("sessionid") ||
          cookie.name.includes("ds_user_id"),
      );

      console.log(
        `[SCRAPER] Post-login cookies (relevant): ${relevantCookies.map((c) => `${c.name}@${c.domain}`).join(", ")}`,
      );

      if (!hasSessionCookie) {
        // If redirected away from login successfully, treat as warning not error
        const finalUrl = page.url();
        if (
          !finalUrl.includes("/login") &&
          !finalUrl.includes("challenge") &&
          !finalUrl.includes("checkpoint")
        ) {
          console.log(
            "[SCRAPER] No session cookies found but redirect succeeded - proceeding cautiously",
          );
        } else {
          throw new Error(
            "Login failed - no session cookies received and still on login/challenge page.",
          );
        }
      }

      // Export session cookies for reuse
      const exportedCookies = await this.exportSessionCookies();
      if (exportedCookies) {
        // Update in-memory env var so session recreation uses fresh cookies
        process.env.THREADS_SESSION_COOKIES = exportedCookies;
        console.log("[SCRAPER] === SESSION COOKIES (base64) ===");
        console.log(exportedCookies);
        console.log("[SCRAPER] === END SESSION COOKIES ===");
        console.log(
          "[SCRAPER] Set THREADS_SESSION_COOKIES env var with the above value to skip login",
        );
      }

      // Update last login time
      this.lastLoginTime = Date.now();
      console.log("[SCRAPER] Login successful");
    } finally {
      await page.close();
    }
  }

  /**
   * Get or create authenticated context
   */
  private async getContext(account: ScraperAccount): Promise<BrowserContext> {
    if (this.contextInstance) {
      const isValid = await this.isSessionValidLocal(this.contextInstance);
      if (isValid) {
        console.log("[SCRAPER] ♻️ Reusing existing session");
        return this.contextInstance;
      } else {
        console.log("[SCRAPER] Session invalid, creating new one...");
        try {
          await this.contextInstance.close();
        } catch (_e) {
          // Ignore
        }
        this.contextInstance = null;
      }
    }

    const browser = await this.getBrowser();
    this.contextInstance = await this.createContext(browser);

    // Try importing session cookies from environment variable
    const sessionCookiesEnv = process.env.THREADS_SESSION_COOKIES;
    if (sessionCookiesEnv) {
      console.log(
        "[SCRAPER] Found THREADS_SESSION_COOKIES, attempting cookie import...",
      );
      const isValid = await this.importSessionCookies(
        this.contextInstance,
        sessionCookiesEnv,
      );

      if (isValid) {
        console.log("[SCRAPER] Cookie import successful, skipping login");
        this.lastLoginTime = Date.now();
        return this.contextInstance;
      } else {
        console.log(
          "[SCRAPER] Imported cookies invalid, falling back to login...",
        );
      }
    }

    if (!account.username || !account.password) {
      throw new Error(
        "Session cookies invalid or missing, and no credentials configured. Set THREADS_USERNAME and THREADS_PASSWORD to login.",
      );
    }

    await this.loginToThreads(this.contextInstance, account);

    return this.contextInstance;
  }

  /**
   * Main scraping logic
   */
  private async doScrape(
    account: ScraperAccount,
    targetUsername: string,
    limit: number,
    onProgress?: (progress: number, message: string) => void,
  ): Promise<{ profile: ThreadsProfile; posts: ThreadsPost[] }> {
    onProgress?.(5, "세션 확인 중...");
    const context = await this.getContext(account);
    const page = await context.newPage();

    // Set extra headers
    await page.setExtraHTTPHeaders({
      "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    });

    // Remove webdriver property
    await page.addInitScript(() => {
      // @ts-expect-error
      delete window.navigator.__proto__.webdriver;
    });

    // Intercept requests: add auth headers + block unnecessary resources for speed
    const BLOCKED_RESOURCE_TYPES = new Set(["image", "media", "font"]);
    await page.route("**/*", async (route) => {
      const request = route.request();

      // Block heavy resources we don't need (images, fonts, CSS)
      if (BLOCKED_RESOURCE_TYPES.has(request.resourceType())) {
        await route.abort();
        return;
      }

      const headers = { ...request.headers() };

      const cookies = await context.cookies();
      const csrfCookie = cookies.find((c) => c.name === "csrftoken");
      if (csrfCookie && request.url().includes("/api/")) {
        headers["X-CSRFToken"] = csrfCookie.value;
        headers["X-Requested-With"] = "XMLHttpRequest";
        headers["X-IG-App-ID"] = "238260118697367";
        headers["X-Instagram-AJAX"] = "1";
      }

      await route.continue({ headers });
    });

    // Set up API response interception for profile and post data
    // Use a wrapper object so TypeScript doesn't narrow the type to null
    // (the assignment happens inside an async callback)
    const apiProfile: {
      data: {
        displayName?: string;
        bio?: string;
        followerCount?: number;
        isVerified?: boolean;
        profileImageUrl?: string;
        hdProfileImageUrl?: string;
        bioLinks?: string[];
        profileTags?: string[];
      } | null;
    } = { data: null };

    const apiPosts: Array<{
      id: string;
      code: string;
      username: string;
      content: string;
      imageUrls: string[];
      likeCount: number;
      replyCount: number;
      repostCount: number;
      shareCount: number;
      postedAt: string;
      threadId?: string;
    }> = [];

    page.on("response", async (response) => {
      const url = response.url();
      const isDebug = process.env.SCRAPER_DEBUG === "true";

      // Capture Threads GraphQL/API responses that may contain profile or post data
      if (
        (url.includes("/api/graphql") ||
          url.includes("/graphql/query") ||
          url.includes("/api/v1/users/") ||
          url.includes("web_profile_info")) &&
        response.status() === 200
      ) {
        if (isDebug) {
          console.log(`[DEBUG] Intercepted API: ${url.substring(0, 120)}`);
        }
        try {
          const json = await response.json();
          const jsonStr = JSON.stringify(json);

          // Only process responses that mention our target user
          if (!jsonStr.includes(targetUsername)) return;

          // Try to extract profile data from the API response
          // Only update if the new extraction has MORE fields (don't let lightweight post-embedded
          // user nodes overwrite a previously extracted rich profile)
          const extracted = this.extractProfileFromApiResponse(
            json,
            targetUsername,
          );
          if (extracted) {
            const newFieldCount = Object.keys(extracted).filter(
              (k) => (extracted as any)[k] !== undefined,
            ).length;
            const existingFieldCount = apiProfile.data
              ? Object.keys(apiProfile.data).filter(
                  (k) => (apiProfile.data as any)[k] !== undefined,
                ).length
              : 0;

            if (newFieldCount > existingFieldCount) {
              console.log(
                `[SCRAPER] Profile data extracted from API response (${newFieldCount} fields, prev ${existingFieldCount})`,
              );
              apiProfile.data = extracted;
            }
          }

          // Try to extract posts data from the API response
          const extractedPosts = this.extractPostsFromApiResponse(
            json,
            targetUsername,
          );
          if (extractedPosts && extractedPosts.length > 0) {
            console.log(
              `[SCRAPER] Captured ${extractedPosts.length} posts from API response`,
            );
            apiPosts.push(...extractedPosts);
          }
        } catch {
          // Not JSON or parse error, skip
        }
      }
    });

    try {
      // Navigate to profile (domcontentloaded is enough — SSR data is in the initial HTML)
      onProgress?.(20, "프로필 이동 중...");
      console.log(`[SCRAPER] Navigating to @${targetUsername} profile...`);
      await page.goto(`https://www.threads.com/@${targetUsername}`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      await page.waitForTimeout(1000);

      // Verify login state after page load
      const pageCookies = await context.cookies();
      const hasSession = pageCookies.some(
        (c) =>
          (c.name.includes("sessionid") || c.name.includes("ds_user_id")) &&
          (c.domain.includes("threads.net") ||
            c.domain.includes("threads.com") ||
            c.domain.includes("instagram.com")),
      );
      if (!hasSession) {
        console.log(
          "[SCRAPER] Session lost - no session cookies on profile page",
        );
        // Invalidate session so next request re-logins
        this.lastLoginTime = 0;
        this.contextInstance = null;
        try {
          await context.close();
        } catch {}
        throw new Error(
          "Session expired during navigation. Will re-login on next request.",
        );
      }

      // Wait briefly for API responses if needed
      if (!apiProfile.data) {
        console.log("[SCRAPER] Waiting for API profile data...");
        await page.waitForTimeout(1500);
      }

      // Fallback: extract rich profile data from SSR-embedded JSON in page scripts
      // (Threads embeds full profile data in <script> tags during SSR, which the API interceptor may miss)
      if (
        !apiProfile.data?.bio &&
        apiProfile.data?.followerCount === undefined
      ) {
        console.log(
          "[SCRAPER] API profile incomplete, extracting from page embedded data...",
        );
        try {
          // Use string-based evaluate to avoid TypeScript __name decorator issues
          const ssrProfile = (await page.evaluate(`
            (function() {
              var username = ${JSON.stringify(targetUsername)};
              var scripts = document.querySelectorAll('script[type="application/json"], script[data-sjs], script[data-content-len]');
              var bestUser = null;
              var bestKeyCount = 0;
              var stack = [];

              // Collect all script JSON data
              for (var i = 0; i < scripts.length; i++) {
                try {
                  var data = JSON.parse(scripts[i].textContent || '');
                  stack.push({ obj: data, depth: 0 });
                } catch(e) {}
              }

              // Also try window.__data or similar React/Relay stores
              try { if (window.__data) stack.push({ obj: window.__data, depth: 0 }); } catch(e) {}
              try { if (window.__relay_store) stack.push({ obj: window.__relay_store, depth: 0 }); } catch(e) {}

              // Iterative BFS to find user nodes
              while (stack.length > 0) {
                var item = stack.pop();
                var obj = item.obj;
                var depth = item.depth;
                if (depth > 20 || !obj || typeof obj !== 'object') continue;

                if (obj.username === username || obj.username === '@' + username) {
                  var kc = Object.keys(obj).length;
                  if (kc > bestKeyCount) { bestUser = obj; bestKeyCount = kc; }
                }
                if (obj.user && typeof obj.user === 'object' &&
                    (obj.user.username === username || obj.user.username === '@' + username)) {
                  var kc2 = Object.keys(obj.user).length;
                  if (kc2 > bestKeyCount) { bestUser = obj.user; bestKeyCount = kc2; }
                }

                if (Array.isArray(obj)) {
                  for (var j = 0; j < obj.length; j++) stack.push({ obj: obj[j], depth: depth + 1 });
                } else {
                  var keys = Object.keys(obj);
                  for (var k = 0; k < keys.length; k++) {
                    try { stack.push({ obj: obj[keys[k]], depth: depth + 1 }); } catch(e) {}
                  }
                }
              }

              if (!bestUser || bestKeyCount < 15) return null;

              return {
                biography: bestUser.biography || bestUser.bio || bestUser.text_post_app_biography || null,
                follower_count: bestUser.follower_count != null ? bestUser.follower_count : (bestUser.text_post_app_follower_count != null ? bestUser.text_post_app_follower_count : null),
                full_name: bestUser.full_name || null,
                is_verified: bestUser.is_verified != null ? bestUser.is_verified : null,
                profile_pic_url: bestUser.profile_pic_url || null,
                hd_profile_pic_versions: bestUser.hd_profile_pic_versions || null,
                bio_links: bestUser.bio_links || null,
                profile_tags: bestUser.profile_tags || null,
                _keyCount: bestKeyCount,
              };
            })()
          `)) as {
            biography: string | null;
            follower_count: number | null;
            full_name: string | null;
            is_verified: boolean | null;
            profile_pic_url: string | null;
            hd_profile_pic_versions: Array<{
              width: number;
              url: string;
            }> | null;
            bio_links: Array<{ url?: string; link?: string }> | null;
            profile_tags: {
              edges: Array<{ node: { display_name?: string; name?: string } }>;
            } | null;
            _keyCount: number;
          } | null;

          if (ssrProfile) {
            console.log(
              `[SCRAPER] Found rich profile in page scripts (${ssrProfile._keyCount} keys)`,
            );
            const merged: typeof apiProfile.data = {
              ...apiProfile.data,
              displayName: ssrProfile.full_name || apiProfile.data?.displayName,
              bio: ssrProfile.biography || apiProfile.data?.bio,
              followerCount:
                ssrProfile.follower_count ?? apiProfile.data?.followerCount,
              isVerified: ssrProfile.is_verified ?? apiProfile.data?.isVerified,
              profileImageUrl:
                ssrProfile.profile_pic_url || apiProfile.data?.profileImageUrl,
            };

            // HD profile image
            if (
              Array.isArray(ssrProfile.hd_profile_pic_versions) &&
              ssrProfile.hd_profile_pic_versions.length > 0
            ) {
              const best = ssrProfile.hd_profile_pic_versions.reduce(
                (a: any, b: any) => (b.width > a.width ? b : a),
              );
              if (best?.url) merged.hdProfileImageUrl = best.url;
            }

            // Bio links
            if (Array.isArray(ssrProfile.bio_links)) {
              const links = ssrProfile.bio_links
                .map((l: any) => l?.url || l?.link)
                .filter((u: any) => typeof u === "string");
              if (links.length > 0) merged.bioLinks = links;
            }

            // Profile tags
            if (
              ssrProfile.profile_tags?.edges &&
              Array.isArray(ssrProfile.profile_tags.edges)
            ) {
              const tags = ssrProfile.profile_tags.edges
                .map((e: any) => e?.node?.display_name || e?.node?.name)
                .filter((t: any) => typeof t === "string");
              if (tags.length > 0) merged.profileTags = tags;
            }

            apiProfile.data = merged;
          } else {
            console.log("[SCRAPER] No rich profile found in page scripts");
          }
        } catch (e) {
          console.log("[SCRAPER] SSR profile extraction error:", e);
        }
      }

      // Fallback: extract initial posts from SSR-embedded JSON
      // (The most recent posts are rendered server-side and may not appear in API intercepts)
      {
        const currentPostIds = new Set(apiPosts.map((p) => p.id));
        try {
          const ssrPosts = (await page.evaluate(`
            (function() {
              var username = ${JSON.stringify(targetUsername)};
              var scripts = document.querySelectorAll('script[type="application/json"], script[data-sjs], script[data-content-len]');
              var posts = [];
              var seenIds = {};
              var stack = [];

              for (var i = 0; i < scripts.length; i++) {
                try {
                  var data = JSON.parse(scripts[i].textContent || '');
                  stack.push({ obj: data, depth: 0 });
                } catch(e) {}
              }

              // Also try window globals (Relay store, etc.)
              try { if (window.__data) stack.push({ obj: window.__data, depth: 0 }); } catch(e) {}
              try { if (window.__relay_store) stack.push({ obj: window.__relay_store, depth: 0 }); } catch(e) {}

              while (stack.length > 0) {
                var item = stack.pop();
                var obj = item.obj;
                var depth = item.depth;
                if (depth > 30 || !obj || typeof obj !== 'object') continue;

                // Look for thread_items arrays
                if (Array.isArray(obj.thread_items) && obj.thread_items.length > 0) {
                  var threadId = null;
                  if (obj.thread_items.length >= 2) {
                    var fp = obj.thread_items[0] && obj.thread_items[0].post;
                    if (fp) threadId = String(fp.pk || fp.id || '');
                  }
                  for (var ti = 0; ti < obj.thread_items.length; ti++) {
                    var post = obj.thread_items[ti] && obj.thread_items[ti].post;
                    if (!post) continue;
                    var pu = post.user && post.user.username;
                    if (pu !== username) continue;
                    var pid = String(post.pk || post.id || '');
                    if (!pid || seenIds[pid]) continue;
                    seenIds[pid] = true;

                    var imageUrls = [];
                    if (Array.isArray(post.carousel_media)) {
                      for (var ci = 0; ci < post.carousel_media.length; ci++) {
                        var cu = post.carousel_media[ci] && post.carousel_media[ci].image_versions2 &&
                                 post.carousel_media[ci].image_versions2.candidates &&
                                 post.carousel_media[ci].image_versions2.candidates[0] &&
                                 post.carousel_media[ci].image_versions2.candidates[0].url;
                        if (cu) imageUrls.push(cu);
                      }
                    }
                    if (imageUrls.length === 0 && post.image_versions2 && post.image_versions2.candidates &&
                        post.image_versions2.candidates[0] && post.image_versions2.candidates[0].url) {
                      imageUrls.push(post.image_versions2.candidates[0].url);
                    }

                    var tpi = post.text_post_app_info || {};
                    var entry = {
                      id: pid,
                      code: post.code || '',
                      username: pu,
                      content: (post.caption && post.caption.text) || '',
                      imageUrls: imageUrls,
                      likeCount: post.like_count || 0,
                      replyCount: tpi.direct_reply_count || 0,
                      repostCount: tpi.repost_count || 0,
                      shareCount: tpi.share_count || 0,
                      postedAt: typeof post.taken_at === 'number' ? new Date(post.taken_at * 1000).toISOString() : '',
                    };
                    if (threadId) entry.threadId = threadId;
                    posts.push(entry);
                  }
                }

                if (Array.isArray(obj)) {
                  for (var j = 0; j < obj.length; j++) stack.push({ obj: obj[j], depth: depth + 1 });
                } else {
                  var keys = Object.keys(obj);
                  for (var k = 0; k < keys.length; k++) {
                    try { stack.push({ obj: obj[keys[k]], depth: depth + 1 }); } catch(e) {}
                  }
                }
              }
              return posts;
            })()
          `)) as Array<{
            id: string;
            code: string;
            username: string;
            content: string;
            imageUrls: string[];
            likeCount: number;
            replyCount: number;
            repostCount: number;
            shareCount: number;
            postedAt: string;
            threadId?: string;
          }>;

          if (ssrPosts && ssrPosts.length > 0) {
            let newCount = 0;
            for (const p of ssrPosts) {
              if (!currentPostIds.has(p.id)) {
                apiPosts.push(p);
                newCount++;
              }
            }
            if (newCount > 0) {
              console.log(
                `[SCRAPER] Extracted ${newCount} additional posts from SSR (total SSR: ${ssrPosts.length})`,
              );
            }
          }
        } catch (e) {
          console.log("[SCRAPER] SSR post extraction error:", e);
        }
      }

      // Build profile from API data (no DOM scraping)
      const apiData = apiProfile.data;
      const profile: ThreadsProfile = {
        username: targetUsername,
        displayName: apiData?.displayName || targetUsername,
        bio: apiData?.bio ?? "",
        profileImageUrl: apiData?.profileImageUrl || "",
        hdProfileImageUrl: apiData?.hdProfileImageUrl,
        followerCount: apiData?.followerCount ?? 0,
        isVerified: apiData?.isVerified,
        bioLinks: apiData?.bioLinks,
        profileTags: apiData?.profileTags,
      };

      console.log("[SCRAPER] Profile extracted (API):", {
        displayName: profile.displayName,
        bio:
          profile.bio.substring(0, 50) + (profile.bio.length > 50 ? "..." : ""),
        followerCount: profile.followerCount,
        isVerified: profile.isVerified,
        profileTags: profile.profileTags,
      });

      // Validate profile exists
      if (
        profile.followerCount === undefined ||
        (profile.followerCount === 0 && !apiData?.bio && !apiData?.isVerified)
      ) {
        throw new Error(
          `User @${targetUsername} not found or profile is private`,
        );
      }

      onProgress?.(35, "데이터 추출 중...");

      // Scroll and collect posts via API interception
      let lastHeight = 0;
      let scrollAttempts = 0;
      const maxScrollAttempts = 15;
      let lastApiPostCount = 0;

      console.log(`[SCRAPER] Collecting up to ${limit} posts...`);

      // Deduplicate helper
      const getUniqueApiPosts = () => {
        const seen = new Set<string>();
        return apiPosts.filter((p) => {
          if (seen.has(p.id)) return false;
          seen.add(p.id);
          return true;
        });
      };

      while (
        getUniqueApiPosts().length < limit &&
        scrollAttempts < maxScrollAttempts
      ) {
        // Scroll down
        await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
        await page.waitForTimeout(1000);

        const uniqueCount = getUniqueApiPosts().length;
        const newHeight = await page.evaluate(() => document.body.scrollHeight);

        if (uniqueCount > lastApiPostCount) {
          console.log(
            `[SCRAPER] Collected ${uniqueCount} unique posts from API so far...`,
          );
          // Progress 50-85% based on posts collected vs limit
          const collectProgress = Math.min(
            85,
            50 + Math.round(((uniqueCount / limit) * 35)),
          );
          onProgress?.(collectProgress, `포스트 수집 중... (${uniqueCount}개)`);
          lastApiPostCount = uniqueCount;
          scrollAttempts = 0; // Reset on progress
        } else if (newHeight === lastHeight) {
          scrollAttempts++;
        }
        lastHeight = newHeight;
      }

      // Build final posts array from API data
      // Sort by date descending BEFORE slicing so newest posts aren't cut off
      const uniqueApiPosts = getUniqueApiPosts();
      uniqueApiPosts.sort(
        (a, b) =>
          new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime(),
      );
      const posts: ThreadsPost[] = uniqueApiPosts.slice(0, limit).map((p) => ({
        id: p.id,
        username: p.username,
        content: p.content,
        imageUrls: p.imageUrls,
        likeCount: p.likeCount,
        replyCount: p.replyCount,
        repostCount: p.repostCount,
        shareCount: p.shareCount,
        postedAt: new Date(p.postedAt),
        threadId: p.threadId,
      }));

      // Log thread detection
      const threadGroups = new Set(
        posts.filter((p) => p.threadId).map((p) => p.threadId),
      );
      if (threadGroups.size > 0) {
        const threadedPosts = posts.filter((p) => p.threadId).length;
        console.log(
          `[SCRAPER] Detected ${threadedPosts} posts in ${threadGroups.size} thread(s)`,
        );
      }

      posts.sort(
        (a, b) =>
          new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime(),
      );
      console.log(`[SCRAPER] Successfully collected ${posts.length} posts`);

      // Validate minimum post count
      if (posts.length < 10) {
        throw new Error(
          `User @${targetUsername} must have at least 10 posts (found ${posts.length})`,
        );
      }

      onProgress?.(90, "마무리 중...");
      return { profile, posts };
    } finally {
      await page.close();
    }
  }

  /**
   * Extract posts from Threads API/GraphQL JSON response.
   * Recursively walks the JSON tree looking for thread_items arrays,
   * then extracts post data from each item.
   */
  private extractPostsFromApiResponse(
    json: any,
    targetUsername: string,
  ): Array<{
    id: string;
    code: string;
    username: string;
    content: string;
    imageUrls: string[];
    likeCount: number;
    replyCount: number;
    repostCount: number;
    shareCount: number;
    postedAt: string;
    threadId?: string;
  }> | null {
    try {
      const posts: Array<{
        id: string;
        code: string;
        username: string;
        content: string;
        imageUrls: string[];
        likeCount: number;
        replyCount: number;
        repostCount: number;
        shareCount: number;
        postedAt: string;
        threadId?: string;
      }> = [];

      const seenIds = new Set<string>();

      // Extract image URLs from a post object
      const extractImageUrls = (post: any): string[] => {
        const urls: string[] = [];

        // Check carousel_media first (multiple images)
        if (Array.isArray(post.carousel_media)) {
          for (const media of post.carousel_media) {
            const url = media?.image_versions2?.candidates?.[0]?.url;
            if (url && typeof url === "string") {
              urls.push(url);
            }
          }
        }

        // Fall back to single image
        if (urls.length === 0) {
          const url = post?.image_versions2?.candidates?.[0]?.url;
          if (url && typeof url === "string") {
            urls.push(url);
          }
        }

        return urls;
      };

      // Extract a single post object into our result format
      const extractPost = (
        post: any,
        threadId?: string,
      ): {
        id: string;
        code: string;
        username: string;
        content: string;
        imageUrls: string[];
        likeCount: number;
        replyCount: number;
        repostCount: number;
        shareCount: number;
        postedAt: string;
        threadId?: string;
      } | null => {
        if (!post || typeof post !== "object") return null;

        const username = post.user?.username;
        if (!username || username !== targetUsername) return null;

        const id = String(post.pk ?? post.id ?? "");
        if (!id) return null;
        if (seenIds.has(id)) return null;
        seenIds.add(id);

        const code = post.code ?? "";
        const content = post.caption?.text ?? "";
        const imageUrls = extractImageUrls(post);
        const likeCount = post.like_count ?? 0;

        const textPostInfo = post.text_post_app_info;
        const replyCount = textPostInfo?.direct_reply_count ?? 0;
        const repostCount = textPostInfo?.repost_count ?? 0;
        const shareCount = textPostInfo?.share_count ?? 0;

        const takenAt = post.taken_at;
        const postedAt =
          typeof takenAt === "number"
            ? new Date(takenAt * 1000).toISOString()
            : "";

        const result: {
          id: string;
          code: string;
          username: string;
          content: string;
          imageUrls: string[];
          likeCount: number;
          replyCount: number;
          repostCount: number;
          shareCount: number;
          postedAt: string;
          threadId?: string;
        } = {
          id,
          code,
          username,
          content,
          imageUrls,
          likeCount,
          replyCount,
          repostCount,
          shareCount,
          postedAt,
        };

        if (threadId) {
          result.threadId = threadId;
        }

        return result;
      };

      // Recursively walk the JSON tree looking for thread_items arrays
      const findThreadNodes = (obj: any, depth: number = 0): void => {
        if (depth > 15 || !obj || typeof obj !== "object") return;

        // Check if this object has thread_items
        if (Array.isArray(obj.thread_items) && obj.thread_items.length > 0) {
          const threadItems = obj.thread_items;

          // Determine threadId: use first post's pk/id only if 2+ items in the thread
          let threadId: string | undefined;
          if (threadItems.length >= 2) {
            const firstPost = threadItems[0]?.post;
            if (firstPost) {
              threadId = String(firstPost.pk ?? firstPost.id ?? "");
              if (!threadId) threadId = undefined;
            }
          }

          for (const item of threadItems) {
            const post = item?.post;
            if (post) {
              const extracted = extractPost(post, threadId);
              if (extracted) {
                posts.push(extracted);
              }
            }
          }

          // Don't return early - continue searching for more thread nodes
        }

        // Recurse into arrays and objects
        if (Array.isArray(obj)) {
          for (const item of obj) {
            findThreadNodes(item, depth + 1);
          }
        } else {
          for (const key of Object.keys(obj)) {
            findThreadNodes(obj[key], depth + 1);
          }
        }
      };

      findThreadNodes(json);

      if (posts.length === 0) return null;
      return posts;
    } catch (e) {
      console.log("[SCRAPER] Error parsing API posts data:", e);
      return null;
    }
  }

  /**
   * Extract profile data from Threads API/GraphQL JSON response
   */
  private extractProfileFromApiResponse(
    json: any,
    targetUsername: string,
  ): {
    displayName?: string;
    bio?: string;
    followerCount?: number;
    isVerified?: boolean;
    profileImageUrl?: string;
    hdProfileImageUrl?: string;
    bioLinks?: string[];
    profileTags?: string[];
  } | null {
    try {
      const _jsonStr = JSON.stringify(json);

      // Walk the JSON tree to find ALL user nodes, then pick the richest one
      // (post-embedded user nodes are lightweight; the profile node has bio/follower data)
      const allUserNodes: any[] = [];
      const collectUserNodes = (obj: any, depth: number = 0): void => {
        if (depth > 15 || !obj || typeof obj !== "object") return;

        if (
          obj.username === targetUsername ||
          obj.username === `@${targetUsername}`
        ) {
          allUserNodes.push(obj);
        }

        if (
          obj.user &&
          typeof obj.user === "object" &&
          obj.user.username === targetUsername
        ) {
          allUserNodes.push(obj.user);
        }

        if (Array.isArray(obj)) {
          for (const item of obj) collectUserNodes(item, depth + 1);
        } else {
          for (const key of Object.keys(obj))
            collectUserNodes(obj[key], depth + 1);
        }
      };

      collectUserNodes(json);
      if (allUserNodes.length === 0) return null;

      // Pick the node with the most keys (most detailed profile data)
      const userData = allUserNodes.reduce((best, node) =>
        Object.keys(node).length > Object.keys(best).length ? node : best,
      );

      const isDebug = process.env.SCRAPER_DEBUG === "true";
      if (isDebug) {
        console.log(
          `[DEBUG] Found ${allUserNodes.length} user node(s), picked one with ${Object.keys(userData).length} keys`,
        );
        console.log(`[DEBUG] userData keys:`, Object.keys(userData).join(", "));
      }

      const result: {
        displayName?: string;
        bio?: string;
        followerCount?: number;
        isVerified?: boolean;
        profileImageUrl?: string;
        hdProfileImageUrl?: string;
        bioLinks?: string[];
        profileTags?: string[];
      } = {};

      // Extract display name
      const name =
        userData.full_name ||
        userData.fullName ||
        userData.display_name ||
        userData.displayName;
      if (name && typeof name === "string" && name.trim()) {
        result.displayName = name.trim();
      }

      // Extract bio
      const bio =
        userData.biography ||
        userData.bio ||
        userData.bio_text ||
        userData.biography_with_entities?.raw_text ||
        userData.text_post_app_biography;
      if (bio && typeof bio === "string") {
        result.bio = bio.trim();
      }

      // Extract follower count
      const followerCount =
        userData.follower_count ??
        userData.followerCount ??
        userData.follower_count_value ??
        userData.text_post_app_follower_count ??
        userData.edge_followed_by?.count ??
        userData.followers_count;
      if (typeof followerCount === "number" && followerCount >= 0) {
        result.followerCount = followerCount;
      }

      // Extract verified status
      const isVerified = userData.is_verified ?? userData.isVerified;
      if (typeof isVerified === "boolean") {
        result.isVerified = isVerified;
      }

      // Extract profile image
      const profilePic =
        userData.profile_pic_url ||
        userData.profilePicUrl ||
        userData.hd_profile_pic_url_info?.url ||
        userData.profile_pic_url_hd;
      if (profilePic && typeof profilePic === "string") {
        result.profileImageUrl = profilePic;
      }

      // Extract HD profile image (highest resolution available)
      if (
        Array.isArray(userData.hd_profile_pic_versions) &&
        userData.hd_profile_pic_versions.length > 0
      ) {
        const hdVersions = userData.hd_profile_pic_versions;
        const best = hdVersions.reduce((a: any, b: any) =>
          b.width > a.width ? b : a,
        );
        if (best?.url) {
          result.hdProfileImageUrl = best.url;
        }
      }

      // Extract bio links
      if (Array.isArray(userData.bio_links)) {
        const links = userData.bio_links
          .map((l: any) => l?.url || l?.link)
          .filter((u: any) => typeof u === "string");
        if (links.length > 0) {
          result.bioLinks = links;
        }
      }

      // Extract profile tags (topics/interests)
      if (
        userData.profile_tags?.edges &&
        Array.isArray(userData.profile_tags.edges)
      ) {
        const tags = userData.profile_tags.edges
          .map((e: any) => e?.node?.display_name || e?.node?.name)
          .filter((t: any) => typeof t === "string");
        if (tags.length > 0) {
          result.profileTags = tags;
        }
      }

      // Only return if we found at least one useful field
      if (Object.keys(result).length > 0) {
        return result;
      }

      return null;
    } catch (e) {
      console.log("[SCRAPER] Error parsing API profile data:", e);
      return null;
    }
  }

  /**
   * Export current session cookies as base64 string
   */
  async exportSessionCookies(): Promise<string | null> {
    if (!this.contextInstance) {
      return null;
    }

    try {
      const cookies = await this.contextInstance.cookies();
      const json = JSON.stringify(cookies);
      return Buffer.from(json).toString("base64");
    } catch (error) {
      console.log("[SCRAPER] Error exporting cookies:", error);
      return null;
    }
  }

  /**
   * Import cookies from base64 string into a browser context
   * Returns true if the imported cookies contain valid session cookies
   */
  private async importSessionCookies(
    context: BrowserContext,
    base64Cookies: string,
  ): Promise<boolean> {
    try {
      const json = Buffer.from(base64Cookies, "base64").toString("utf-8");
      const cookies = JSON.parse(json);

      if (!Array.isArray(cookies) || cookies.length === 0) {
        console.log("[SCRAPER] Invalid cookie data: not an array or empty");
        return false;
      }

      await context.addCookies(cookies);

      // Validate that session cookies exist
      const imported = await context.cookies();
      const hasSession = imported.some(
        (c) =>
          (c.name === "sessionid" || c.name === "ds_user_id") &&
          (c.domain.includes("threads.net") ||
            c.domain.includes("threads.com") ||
            c.domain.includes("instagram.com")),
      );

      if (hasSession) {
        console.log(
          `[SCRAPER] Imported ${cookies.length} cookies (session valid)`,
        );
      } else {
        console.log(
          "[SCRAPER] Imported cookies but no valid session cookies found",
        );
      }

      return hasSession;
    } catch (error) {
      console.log("[SCRAPER] Error importing cookies:", error);
      return false;
    }
  }

  /**
   * Close browser
   */
  async close(): Promise<void> {
    if (this.contextInstance) {
      await this.contextInstance.close();
      this.contextInstance = null;
    }
    if (this.browserInstance) {
      await this.browserInstance.close();
      this.browserInstance = null;
    }
  }
}

export const scraperWorker = new ScraperWorker();
