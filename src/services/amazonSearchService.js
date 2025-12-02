require('dotenv').config();
const fs = require('fs');
const path = require('path');
const BaseScraper = require('./baseScraper');
const logger = require('../utils/logger');

class AmazonSearchService extends BaseScraper {
    constructor(options = {}) {
        super({
            ...options,
            outputDir: options.outputDir || path.join(__dirname, '../../amazon_search_output'),
            offersLimit: options.offersLimit || '15',
            delayMs: options.delayMs || '1500',
            loginWait: options.loginWait || process.env.AMAZON_LOGIN_WAIT_MS || '10000',
            email: options.email || process.env.AMAZON_EMAIL || '',
            password: options.password || process.env.AMAZON_PASSWORD || '',
            // Amazon specific options
            region: options.region || process.env.AMAZON_REGION || 'com',
            isBusiness: (options.business === true || options.business === 'true') || (process.env.AMAZON_BUSINESS === 'true'),
            userAgent: options.userAgent || process.env.AMAZON_USER_AGENT || '',
            offlineParseFallback: options.offlineParseFallback !== 'false',
            waitPriceMs: parseInt(options.waitPriceMs || '4000', 10),
            // Env overrides
            ...(process.env.AMAZON_HEADLESS ? { headless: process.env.AMAZON_HEADLESS === 'true' } : {}),
            ...(process.env.AMAZON_KEEP_OPEN_MS ? { keepOpen: parseInt(process.env.AMAZON_KEEP_OPEN_MS, 10) } : {}),
            ...(process.env.AMAZON_WAIT_PRICE_MS ? { waitPriceMs: parseInt(process.env.AMAZON_WAIT_PRICE_MS, 10) } : {}),
        });

        this.resultsCsv = path.join(this.options.outputDir, 'amazon_results.csv');
        this.offersCsv = path.join(this.options.outputDir, 'amazon_offers_detailed.csv');
    }

    async run() {
        // Amazon run logic is slightly different due to region setup and UA
        // So we override run() but use super methods where possible
        // Actually, BaseScraper.run() is generic enough if we handle the setup in handleLogin or before
        // But Amazon needs context-level headers before page creation sometimes, or right after.
        // BaseScraper creates context then calls handleLogin.
        // We can inject the UA in handleLogin or override run completely.
        // Overriding run is safer to preserve the exact sequence of Amazon setup.

        logger.info('=== Amazon Search ===');
        // ... (logging done in super, but we can add more)

        // We can reuse readParts from super
        const parts = this.readParts(this.options.file);
        const uniqueParts = [...new Set(parts.map(p => String(p).trim()))].filter(Boolean);
        const slice = this.options.maxParts > 0 ? uniqueParts.slice(0, this.options.maxParts) : uniqueParts;

        this.initializeCsvs();

        const BrowserFactory = require('../utils/browser');
        let context, page;

        try {
            ({ context, page } = await BrowserFactory.create('pw-profile-amazon-search', this.options.headless));

            const baseDomain = this.options.isBusiness ? 'https://business.amazon.' + this.options.region : 'https://www.amazon.' + this.options.region;
            logger.info(`Opening Amazon base: ${baseDomain}`);
            await page.goto(baseDomain, { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(1500);

            // Set UA and a region hint accessible in page context
            if (this.options.userAgent) {
                await page.context().setExtraHTTPHeaders({ 'User-Agent': this.options.userAgent });
            }
            await page.addInitScript((region) => {
                window.__AMZ_REGION__ = region;
            }, this.options.region);

            await this.handleLogin(page, baseDomain);

            for (const [idx, part] of slice.entries()) {
                logger.info(`Searching (${idx + 1}/${slice.length}): ${part}`);
                await this.processPart(page, part);
                await page.waitForTimeout(this.options.delayMs);
            }

        } catch (error) {
            logger.error('Fatal Error: %s', error.message);
        } finally {
            this.generateJsonOutput();

            logger.info('=== Amazon Search Finished ===');
            if (this.options.keepOpen > 0 && page) {
                await page.waitForTimeout(this.options.keepOpen);
            }
            if (context) await context.close();
        }
    }

    async handleLogin(page, baseDomain) {
        // If credentials provided and autoLogin requested, attempt automated login.
        if (this.options.autoLogin && this.options.email && this.options.password) {
            try {
                const signInUrl = this.options.isBusiness ? `${baseDomain}/ap/signin` : `https://www.amazon.${this.options.region}/ap/signin`;
                logger.info(`Attempting Amazon auto-login at ${signInUrl}`);
                await page.goto(signInUrl, { waitUntil: 'domcontentloaded' });
                await page.waitForTimeout(1000);

                const emailSelector = '#ap_email, input[name="email"]';
                const contSelector = '#continue, input#continue, button[name="continue"]';
                const passSelector = '#ap_password, input[name="password"]';
                const submitSelector = '#signInSubmit, input#signInSubmit, button[type="submit"]';

                const alreadySignedIndicator = await page.$('#nav-link-accountList, [data-nav-role="signin"]');
                if (alreadySignedIndicator) {
                    const navText = await alreadySignedIndicator.textContent().catch(() => '') || '';
                    if (/Sign|Inicia/i.test(navText)) {
                        logger.info('Navigation account element suggests not signed in yet. Proceeding with login form.');
                    } else {
                        logger.info('Detected account element without Sign In text; may already be logged in.');
                    }
                }

                if (await page.$(emailSelector)) {
                    await page.fill(emailSelector, this.options.email);
                    if (await page.$(contSelector)) {
                        await Promise.all([
                            page.click(contSelector),
                            page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => { })
                        ]);
                    }
                } else {
                    logger.info('Email input not found, may already be signed in.');
                }

                if (await page.$(passSelector)) {
                    await page.fill(passSelector, this.options.password);
                    if (await page.$(submitSelector)) {
                        await Promise.all([
                            page.click(submitSelector),
                            page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => { })
                        ]);
                    }
                    logger.info('Amazon auto-login attempted.');
                } else {
                    logger.info('Password field not found (maybe MFA or already logged).');
                }

                // Post login verification: check for account name or sign-out link
                await page.waitForTimeout(1500);
                const accountNav = await page.$('#nav-link-accountList span.nav-line-1, #nav-link-accountList .nav-line-1');
                let accountText = '';
                if (accountNav) accountText = (await accountNav.textContent()).trim();
                const signOutCandidate = await page.$('a[href*="/gp/flex/sign-out"], a[href*="/logout"], #nav-item-signout');
                if (signOutCandidate) {
                    logger.info(`Login status: sign-out link present. Account text: ${accountText || 'N/A'}`);
                } else {
                    logger.info(`Login status uncertain; no sign-out link found. Account text: ${accountText || 'N/A'}`);
                }

                // Detect potential captcha or MFA challenge
                const captcha = await page.$('img[src*="captcha"], form[action*="/errors/validateCaptcha"], #auth-captcha-image');
                if (captcha) {
                    logger.warn('Captcha detected during login. Manual intervention required.');
                }
                const mfa = await page.$('input[name="otpCode"], #auth-mfa-otpcode');
                if (mfa) {
                    logger.warn('MFA challenge detected. Waiting for manual completion.');
                }

            } catch (e) {
                logger.warn(`Auto-login error: ${e.message}`);
                logger.info(`Waiting ${this.options.loginWait}ms for manual intervention (MFA/captcha)...`);
                await page.waitForTimeout(this.options.loginWait);
            }
        } else {
            logger.info(`Waiting ${this.options.loginWait}ms for manual login (no credentials or autoLogin disabled)...`);
            await page.waitForTimeout(this.options.loginWait);
        }
    }

    async processPart(page, part) {
        try {
            const searchUrl = `https://www.amazon.${this.options.region}/s?k=${encodeURIComponent(part)}`;
            await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
            // Wait explicitly for any plausible search result container to appear
            await Promise.race([
                page.waitForSelector('[data-component-type="s-search-result"]', { timeout: 8000 }).catch(() => { }),
                page.waitForSelector('div.s-result-item', { timeout: 8000 }).catch(() => { }),
                page.waitForSelector('div.sg-col-4-of-12', { timeout: 8000 }).catch(() => { })
            ]);
            await page.waitForTimeout(1000);
            // Additional wait for price nodes (lazy-loaded)
            await page.waitForSelector('.a-price .a-offscreen, span.a-price-whole', { timeout: this.options.waitPriceMs }).catch(() => { });

            // Basic incremental scroll to load more items
            for (let s = 0; s < 3; s++) {
                await page.evaluate(() => window.scrollBy(0, window.innerHeight));
                await page.waitForTimeout(600);
            }

            const pageTitle = await page.title();
            const pageUrl = page.url();
            this.saveResults(pageTitle, pageUrl, part);

            if (this.options.saveHtml) {
                const html = await page.content();
                const htmlPath = path.join(this.options.outputDir, `result-${part.replace(/[^a-zA-Z0-9]/g, '-')}.html`);
                fs.writeFileSync(htmlPath, html, 'utf8');
            }

            if (this.options.saveScreenshot) {
                const screenshotPath = path.join(this.options.outputDir, `screenshot-${part.replace(/[^a-zA-Z0-9]/g, '-')}.png`);
                await page.screenshot({ path: screenshotPath, fullPage: false });
            }

            await this.extractAndSaveOffers(page, part);

        } catch (error) {
            logger.error(`Error processing ${part}: ${error.message}`);
        }
    }

    async extractAndSaveOffers(page, part) {
        try {
            // Try multiple container selectors to maximize compatibility
            const containersSelector = '[data-component-type="s-search-result"], div.s-result-item, .puis-card-container';
            // Count containers first for logging
            const containersCount = await page.$$eval(containersSelector, items => items.length).catch(() => 0);
            logger.info(`Containers detected for ${part}: ${containersCount}`);
            const offers = await page.$$eval(containersSelector, (items, ctx) => {
                const { partNum, limit } = ctx;
                const results = [];
                for (let i = 0; i < Math.min(items.length, limit); i++) {
                    const item = items[i];

                    const titleEl = item.querySelector('h2 a span');
                    // Price candidates: a-offscreen, whole+fraction, third-party price blocks
                    let priceEl = item.querySelector('.a-price .a-offscreen');
                    if (!priceEl) {
                        // Try whole + fraction
                        const whole = item.querySelector('span.a-price-whole');
                        const fraction = item.querySelector('span.a-price-fraction');
                        if (whole) {
                            const fractionText = fraction ? fraction.textContent.trim() : '00';
                            const combined = whole.textContent.trim().replace(/[,]/g, '') + '.' + fractionText;
                            priceEl = { textContent: combined };
                        }
                    }
                    if (!priceEl) {
                        // Some listings show price in alternative nodes
                        const alt = item.querySelector('[data-a-color="price"] .a-offscreen') || item.querySelector('.a-color-price');
                        if (alt) priceEl = alt;
                    }
                    const ratingEl = item.querySelector('[aria-label*="out of"]');

                    const title = titleEl ? titleEl.textContent.trim() : '';
                    let price = priceEl ? priceEl.textContent.trim() : '';
                    // Normalización básica
                    price = price.replace(/\u00A0/g, ' ').replace(/^[Ff]rom\s+/, '').replace(/\s*-\s*/g, '-');
                    const rating = ratingEl ? ratingEl.getAttribute('aria-label').split(' ')[0] : '';
                    const linkEl = item.querySelector('h2 a');
                    // Build URL using the configured region
                    const href = linkEl ? linkEl.getAttribute('href') : '';
                    const url = href ? ('https://www.amazon.' + (window.__AMZ_REGION__ || 'com') + href) : '';

                    if (price) {
                        results.push({
                            part: partNum,
                            rank: i + 1,
                            company: 'Amazon', // maps to company
                            price: price.replace(/\$/g, ''),
                            raw_price: price.replace(/\$/g, ''),
                            is_call: '0', // no call offers concept for Amazon search results
                            qty: '', // unknown quantity on search listing
                            condition: 'NEW',
                            manufacturer: '', // not directly available
                            location: '', // Amazon marketplace listing doesn't expose location
                            age: '', // not applicable
                            description: title,
                            page_url: url,
                            timestamp: new Date().toISOString()
                        });
                    }
                }
                return results;
            }, { partNum: part, limit: this.options.offersLimit });

            if (offers.length === 0) {
                // Fallback: intentar precio en página de producto
                const firstLink = await page.$('h2 a');
                if (firstLink) {
                    const href = await firstLink.getAttribute('href');
                    if (href) {
                        const prodUrl = 'https://www.amazon.' + this.options.region + href;
                        try {
                            await page.goto(prodUrl, { waitUntil: 'domcontentloaded' });
                            await page.waitForTimeout(1200);
                            const priceNode = await page.$('#corePriceDisplay_desktop_feature_div .a-offscreen, .a-price .a-offscreen');
                            if (priceNode) {
                                let pText = (await priceNode.textContent()).trim();
                                pText = pText.replace(/^[Ff]rom\s+/, '').replace(/\s*-\s*/g, '-');
                                if (pText) {
                                    const ts = new Date().toISOString();
                                    const lineArr = [part, 1, 'Amazon', pText.replace(/\$/g, ''), pText.replace(/\$/g, ''), '0', '', 'NEW', '', '', '', 'Fallback product page price', prodUrl, ts];
                                    this.appendCsv(this.offersCsv, lineArr);
                                    logger.info(`Fallback product page price captured for ${part}: ${pText}`);
                                    return;
                                }
                            }
                        } catch (e) {
                            // ignorar y continuar
                        }
                    }
                }
                // Offline HTML parse fallback using saved file if enabled
                if (this.options.offlineParseFallback && this.options.saveHtml) {
                    const htmlPath = path.join(this.options.outputDir, `result-${part.replace(/[^a-zA-Z0-9]/g, '-')}.html`);
                    if (fs.existsSync(htmlPath)) {
                        try {
                            const html = fs.readFileSync(htmlPath, 'utf8');
                            const offlineOffers = this.parseHtmlOffline(html, part).slice(0, this.options.offersLimit);
                            if (offlineOffers.length) {
                                for (const off of offlineOffers) {
                                    const lineArr = [off.part, off.rank, off.company, off.price, off.raw_price, off.is_call, off.qty, off.condition, off.manufacturer, off.location, off.age, off.description, off.page_url, off.timestamp];
                                    this.appendCsv(this.offersCsv, lineArr);
                                }
                                logger.info(`Offline fallback captured ${offlineOffers.length} offers for ${part}`);
                                return;
                            } else {
                                logger.warn(`Offline fallback found 0 offers for ${part}`);
                            }
                        } catch (e) {
                            logger.warn(`Offline parse error for ${part}: ${e.message}`);
                        }
                    } else {
                        logger.warn(`Offline HTML not found for ${part} at ${htmlPath}`);
                    }
                }
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

        } catch (error) {
            logger.error(`Error extracting offers for ${part}: ${error.message}`);
            const ts = new Date().toISOString();
            const noOffer = [part, 1, 'ERROR', '', '', '0', '', '', '', '', '', 'Error extracting offers', page.url(), ts];
            this.appendCsv(this.offersCsv, noOffer);
        }
    }

    parseHtmlOffline(html, part) {
        let cheerio;
        try {
            cheerio = require('cheerio');
        } catch (e) {
            logger.warn('cheerio not installed; offline parse skipped');
            return [];
        }
        const $ = cheerio.load(html);
        const containers = $('[data-component-type="s-search-result"], div.s-result-item');
        const offers = [];
        containers.each((i, el) => {
            if (offers.length >= this.options.offersLimit) return false;
            const title = $(el).find('h2 a span').first().text().trim();
            let price = $(el).find('.a-price .a-offscreen').first().text().trim();
            if (!price) {
                const whole = $(el).find('span.a-price-whole').first().text().trim().replace(/[,]/g, '');
                const fraction = $(el).find('span.a-price-fraction').first().text().trim();
                if (whole) price = whole + (fraction ? '.' + fraction : '.00');
            }
            if (!price) price = $(el).find('[data-a-color="price"] .a-offscreen').first().text().trim();
            price = price.replace(/^[Ff]rom\s+/, '').replace(/\s*-\s*/g, '-').replace(/\$/g, '');
            const href = $(el).find('h2 a').attr('href') || '';
            const url = href ? `https://www.amazon.${this.options.region}${href}` : '';
            if (price) {
                offers.push({
                    part,
                    rank: offers.length + 1,
                    company: 'Amazon',
                    price,
                    raw_price: price,
                    is_call: '0',
                    qty: '',
                    condition: 'NEW',
                    manufacturer: '',
                    location: '',
                    age: '',
                    description: title,
                    page_url: url,
                    timestamp: new Date().toISOString()
                });
            }
        });
        return offers;
    }
}

// CLI Support
if (require.main === module) {
    const args = process.argv.slice(2);
    const opts = {};
    for (const a of args) {
        if (a.startsWith('--')) {
            const [key, rawVal] = a.replace(/^--/, '').split('=');
            opts[key] = rawVal === undefined ? true : rawVal;
        }
    }

    const options = {
        file: opts.file,
        columnIndex: opts['column-index'],
        columnName: opts['column-name'],
        skipHeader: opts['skip-header'],
        sheetName: opts['excel-sheet'],
        maxParts: opts['max-parts'],
        offersLimit: opts['offers-limit'],
        delayMs: opts['delay-ms'],
        headless: opts.headless,
        outputDir: opts['output-dir'],
        saveHtml: opts['save-html'],
        saveScreenshot: opts['save-screenshot'],
        keepOpen: opts['keep-open'],
    };

    new AmazonSearchService(options).run();
}

module.exports = { AmazonSearchService };
