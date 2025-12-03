const BaseScraper = require('./baseScraper');
const logger = require('../utils/logger');
const path = require('path');
const StealthBrowserFactory = require('../utils/stealthBrowser');

class EbayService extends BaseScraper {
    constructor(options = {}) {
        super({
            ...options,
            outputDir: options.outputDir || (process.env.VERCEL ? '/tmp' : 'ebay_output'),
            offersLimit: options.offersLimit || '15',
            delayMs: options.delayMs || '2000', // eBay might be stricter
            loginWait: options.loginWait || '10000',
        });

        this.resultsCsv = path.join(this.options.outputDir, 'ebay_results.csv');
        this.offersCsv = path.join(this.options.outputDir, 'ebay_offers_detailed.csv');
    }

    async run() {
        // Override run to use StealthBrowserFactory
        logger.info(`=== ${this.constructor.name} Started ===`);
        const { sanitizeObject } = require('../utils/secrets');
        logger.info('Options: %o', sanitizeObject(this.options));

        const parts = this.readParts(this.options.file);
        const uniqueParts = [...new Set(parts.map(p => String(p).trim()))].filter(Boolean);
        logger.info(`Total unique parts: ${uniqueParts.length}`);

        const slice = this.options.maxParts > 0 ? uniqueParts.slice(0, this.options.maxParts) : uniqueParts;
        logger.info(`Processing: ${slice.length}`);

        this.initializeCsvs();

        let context, page;

        try {
            try {
                if (process.env.BROWSER_WS_ENDPOINT) {
                    logger.info(`Connecting to remote browser: ${process.env.BROWSER_WS_ENDPOINT}`);
                    const { chromium } = require('playwright');
                    const browser = await chromium.connect(process.env.BROWSER_WS_ENDPOINT);
                    context = await browser.newContext();
                    page = await context.newPage();
                } else if (process.env.VERCEL) {
                    logger.warn('Running on Vercel without BROWSER_WS_ENDPOINT. Launching local browser (may fail due to size limits)...');
                    const { chromium } = require('playwright');
                    const browser = await chromium.launch({ headless: true });
                    context = await browser.newContext();
                    page = await context.newPage();
                } else {
                    ({ context, page } = await StealthBrowserFactory.create('pw-profile-ebay', this.options.headless));
                }

                const startUrl = 'https://www.ebay.com/';
                logger.info(`Opening ${startUrl}...`);
                await page.goto(startUrl, { waitUntil: 'domcontentloaded' });

                await this.handleLogin(page);

                for (const [idx, part] of slice.entries()) {
                    logger.info(`Searching (${idx + 1}/${slice.length}): ${part}`);
                    await this.processPart(page, part);
                    await page.waitForTimeout(this.options.delayMs);
                }

            } catch (error) {
                logger.error('Fatal Error: %s', error.message);
            } finally {
                this.generateJsonOutput();

                logger.info(`=== ${this.constructor.name} Finished ===`);
                if (this.options.keepOpen > 0 && page) {
                    logger.info(`Keeping browser open for ${this.options.keepOpen}ms...`);
                    await page.waitForTimeout(this.options.keepOpen);
                }
                if (context) await context.close();
            }
        }

    async handleLogin(page) {
            if (this.options.username && this.options.password) {
                try {
                    logger.info('Attempting eBay login...');
                    const loginBtn = await page.$('a[href*="signin"]');
                    if (loginBtn) {
                        await Promise.all([loginBtn.click(), page.waitForNavigation({ waitUntil: 'domcontentloaded' })]);
                    }

                    // eBay login flow is complex (often 2-step). This is a basic skeleton.
                    const userInput = await page.$('#userid');
                    if (userInput) {
                        await page.fill('#userid', this.options.username);
                        await page.click('#signin-continue-btn');
                        await page.waitForTimeout(1000);
                    }

                    const passInput = await page.$('#pass');
                    if (passInput) {
                        await page.fill('#pass', this.options.password);
                        await page.click('#sgnBt');
                        await page.waitForNavigation();
                    }

                    logger.info('eBay login flow executed (check logs for success/captcha).');
                } catch (e) {
                    logger.warn(`eBay login failed/skipped: ${e.message}`);
                }
            } else {
                logger.info('No credentials provided for eBay, proceeding as guest.');
            }
        }

    async processPart(page, part) {
            try {
                const searchUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(part)}&_sacat=0`;
                await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });

                // Wait for results
                await Promise.race([
                    page.waitForSelector('.s-item', { timeout: 5000 }).catch(() => { }),
                    page.waitForSelector('.srp-results', { timeout: 5000 }).catch(() => { })
                ]);

                const pageTitle = await page.title();
                this.saveResults(pageTitle, page.url(), part);

                if (this.options.saveHtml) {
                    const html = await page.content();
                    const fs = require('fs');
                    fs.writeFileSync(path.join(this.options.outputDir, `result-${part}.html`), html, 'utf8');
                }

                await this.extractAndSaveOffers(page, part);

            } catch (e) {
                logger.error(`Error processing eBay part ${part}: ${e.message}`);
            }
        }

    async extractAndSaveOffers(page, part) {
            try {
                let offers = await page.$$eval('.s-item', (items, ctx) => {
                    const { partNum, limit } = ctx;
                    const results = [];
                    // Skip the first item if it's the "Shop on eBay" header item which sometimes shares the class
                    let startIndex = 0;

                    for (let i = startIndex; i < items.length; i++) {
                        if (results.length >= limit) break;

                        const item = items[i];
                        const titleEl = item.querySelector('.s-item__title');
                        if (!titleEl || titleEl.textContent.includes('Shop on eBay')) continue;

                        const priceEl = item.querySelector('.s-item__price');
                        const linkEl = item.querySelector('.s-item__link');
                        const conditionEl = item.querySelector('.s-item__subtitle .SECONDARY_INFO');
                        const shippingEl = item.querySelector('.s-item__shipping');

                        const title = titleEl ? titleEl.textContent.trim() : '';
                        let price = priceEl ? priceEl.textContent.trim() : '';
                        const url = linkEl ? linkEl.href : '';
                        const condition = conditionEl ? conditionEl.textContent.trim() : 'Used'; // Default assumption if missing
                        const shipping = shippingEl ? shippingEl.textContent.trim() : '';

                        if (price) {
                            results.push({
                                part: partNum,
                                rank: results.length + 1,
                                company: 'eBay Seller', // Placeholder, real seller name requires more parsing
                                price: price.replace(/[$,]/g, ''),
                                raw_price: price,
                                is_call: '0',
                                qty: '1',
                                condition: condition,
                                manufacturer: '',
                                location: '',
                                age: '',
                                description: `${title} ${shipping}`,
                                page_url: url,
                                timestamp: new Date().toISOString()
                            });
                        }
                    }
                    return results;
                }, { partNum: part, limit: this.options.offersLimit });

                const aiEnabled = this.options.aiEnrichment === true || this.options.aiEnrichment === 'true';
                if (aiEnabled) {
                    try {
                        const { enrichOffers } = require('../ai/enrichment');
                        offers = enrichOffers(offers);
                    } catch (e) {
                        logger.warn('AI enrichment failed: %s', e.message);
                    }
                }

                if (offers.length === 0) {
                    const ts = new Date().toISOString();
                    const noOffer = [part, 1, 'NO OFFERS', '', '', '0', '', '', '', '', '', 'No offers found', page.url(), ts];
                    this.appendCsv(this.offersCsv, noOffer);
                    return;
                }

                for (const offer of offers) {
                    const lineArr = [
                        offer.part,
                        offer.rank,
                        offer.company,
                        offer.price,
                        offer.raw_price,
                        offer.is_call,
                        offer.qty,
                        offer.condition,
                        offer.manufacturer,
                        offer.location,
                        offer.age,
                        offer.description,
                        offer.page_url,
                        offer.timestamp
                    ];
                    this.appendCsv(this.offersCsv, lineArr);
                }

            } catch (e) {
                logger.error(`Error extracting eBay offers for ${part}: ${e.message}`);
            }
        }
    }

module.exports = EbayService;
