const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

class BrowserFactory {
    /**
     * Launches a persistent browser context.
     * @param {string} profileName - Name of the profile directory (e.g., 'pw-profile').
     * @param {boolean} headless - Whether to run in headless mode.
     * @returns {Promise<{context: import('playwright').BrowserContext, page: import('playwright').Page}>}
     */
    static async create(profileName, headless = false) {
        const userDataDir = path.join(process.cwd(), profileName);

        // Ensure profile directory exists (Playwright creates it, but good to be explicit if needed)
        if (!fs.existsSync(userDataDir)) {
            fs.mkdirSync(userDataDir, { recursive: true });
        }

        console.log(`Launching browser with profile: ${userDataDir} (Headless: ${headless})`);

        const context = await chromium.launchPersistentContext(userDataDir, {
            headless,
            viewport: { width: 1280, height: 720 },
            args: ['--no-sandbox', '--disable-setuid-sandbox'], // Useful for some environments
        });

        const page = await context.newPage();
        return { context, page };
    }
}

module.exports = BrowserFactory;
