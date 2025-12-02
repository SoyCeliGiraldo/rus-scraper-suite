const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const path = require('path');
const fs = require('fs');

// Add stealth plugin to playwright-extra
chromium.use(stealth);

class StealthBrowserFactory {
    /**
     * Launches a stealth persistent browser context that evades bot detection.
     * @param {string} profileName - Name of the profile directory (e.g., 'pw-profile-ebay').
     * @param {boolean} headless - Whether to run in headless mode.
     * @returns {Promise<{context: import('playwright').BrowserContext, page: import('playwright').Page}>}
     */
    static async create(profileName, headless = false) {
        const userDataDir = path.join(process.cwd(), profileName);

        // Ensure profile directory exists
        if (!fs.existsSync(userDataDir)) {
            fs.mkdirSync(userDataDir, { recursive: true });
        }

        console.log(`Launching stealth browser with profile: ${userDataDir} (Headless: ${headless})`);

        const context = await chromium.launchPersistentContext(userDataDir, {
            headless,
            viewport: { width: 1920, height: 1080 }, // More realistic viewport
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled', // Critical for stealth
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ],
            // Realistic user agent
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            locale: 'en-US',
            timezoneId: 'America/New_York',
            permissions: [],
            // Additional stealth settings
            ignoreDefaultArgs: ['--enable-automation'],
        });

        // Additional stealth measures
        await context.addInitScript(() => {
            // Override the navigator.webdriver property
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
            });

            // Mock plugins to appear more like a real browser
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5],
            });

            // Mock languages
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en'],
            });

            // Chrome runtime
            window.chrome = {
                runtime: {},
            };

            // Permissions
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission }) :
                    originalQuery(parameters)
            );
        });

        const page = await context.newPage();
        return { context, page };
    }
}

module.exports = StealthBrowserFactory;
