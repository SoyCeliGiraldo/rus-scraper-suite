const fs = require('fs');
const path = require('path');
const BaseScraper = require('./baseScraper');
const logger = require('../utils/logger');

class BrokerBinService extends BaseScraper {
  constructor(options = {}) {
    super({
      ...options,
      username: options.username || process.env.BROKERBIN_USER || '',
      password: options.password || process.env.BROKERBIN_PASS || '',
      outputDir: options.outputDir || (process.env.VERCEL ? '/tmp' : 'brokerbin_output'),
      offersLimit: options.offersLimit || '15',
      delayMs: options.delayMs || '1200',
      loginWait: options.loginWait || '8000',
    });

    // Override default paths if needed, though BaseScraper defaults are good generic ones
    // But for backward compatibility with existing tests/scripts, we set specific names
    this.resultsCsv = path.join(this.options.outputDir, 'brokerbin_results.csv');
    this.offersCsv = path.join(this.options.outputDir, 'brokerbin_offers_detailed.csv');
  }

  async run() {
    // We call super.run with specific profile and start URL
    await super.run('pw-profile-brokerbin', 'https://www.brokerbin.com/');
  }

  async handleLogin(page) {
    if (this.options.username && this.options.password) {
      try {
        const loginButton = await page.$('a:has-text("Login"), a:has-text("Sign In")');
        if (loginButton) {
          await Promise.all([loginButton.click(), page.waitForNavigation({ waitUntil: 'domcontentloaded' })]);
        }

        const userSelector = 'input[name="username"], input#username, input[name="login"]';
        const passSelector = 'input[name="password"], input#password';

        // Check if already logged in or if selectors exist
        if (await page.$(userSelector)) {
          await page.fill(userSelector, this.options.username);
          await page.fill(passSelector, this.options.password);

          const submitSelector = 'button[type="submit"], input[type="submit"], button:has-text("Login")';
          await Promise.all([page.click(submitSelector), page.waitForNavigation({ waitUntil: 'domcontentloaded' })]);
          logger.info('Auto-login attempted.');
        } else {
          logger.info('Login form not found, assuming already logged in.');
        }

      } catch (e) {
        logger.warn('Auto-login failed: %s', e.message);
        logger.info(`Waiting ${this.options.loginWait}ms for manual login...`);
        await page.waitForTimeout(this.options.loginWait);
      }
    } else {
      logger.info(`Waiting ${this.options.loginWait}ms for manual login (no credentials)...`);
      await page.waitForTimeout(this.options.loginWait);
    }
  }

  async processPart(page, part) {
    try {
      const directUrl = `https://members.brokerbin.com/partkey?login=${encodeURIComponent(this.options.username || 'redsispurchasing')}&parts=${encodeURIComponent(part)}&clm=partclei&mfgfilter=`;
      await page.goto(directUrl, { waitUntil: 'domcontentloaded' });

      const hasRows = await page.waitForSelector('tr:has(input[name="partcart[]"])', { timeout: 5000 }).catch(() => null);
      if (!hasRows) {
        const noMatch = await page.$('.error, .hr_partkey_not_found');
        if (noMatch) {
          logger.info(`No direct match for ${part}, trying advanced search...`);
          await page.goto(`https://members.brokerbin.com/advanced?descr=${encodeURIComponent(part)}`, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(2000);
        }
      }

      if (this.options.saveHtml) {
        const html = await page.content();
        fs.writeFileSync(path.join(this.options.outputDir, `result-${part}.html`), html, 'utf8');
      }

      if (this.options.saveScreenshot) {
        await page.screenshot({ path: path.join(this.options.outputDir, `result-${part}.png`), fullPage: true });
      }

      // Use BaseScraper's saveResults
      const pageTitle = (await page.title()) || '';
      this.saveResults(pageTitle, page.url(), part);

      await this.extractAndSaveOffers(page, part);

    } catch (e) {
      logger.error('Error processing part %s: %s', part, e.message);
    }
  }

  async extractAndSaveOffers(page, part) {
    let offers = await this.extractTopOffers(page, part, this.options.offersLimit);
    if (!offers.length) {
      offers = await this.extractFirstOffer(page, part);
    }

    // Filter noise
    offers = offers.filter(off => {
      const company = (off.company || '').trim();
      const price = (off.price || '').trim();
      const isCall = String(off.is_call || '0') === '1';
      const hasNumericPrice = /^\d+(?:\.\d{2})?$/.test(price);
      const privacyNoise = /privacy/i.test(company) || /^©\s*\d{4}/.test(company);
      return !privacyNoise && (isCall || hasNumericPrice);
    });

    if (!offers.length) {
      const pageUrl = page.url();
      const ts = new Date().toISOString();
      const noOffer = [part, 1, 'NO OFFERS', '', '', '0', '', '', '', '', '', 'No offers found', pageUrl, ts];
      this.appendCsv(this.offersCsv, noOffer);
      return;
    }

    let rank = 1;
    for (const off of offers) {
      const lineArr = [off.part, rank, off.company, off.price, off.raw_price, off.is_call, off.qty, off.condition, off.manufacturer, off.location, off.age, off.description, off.page_url, off.timestamp];
      this.appendCsv(this.offersCsv, lineArr);
      rank++;
    }
  }

  async extractTopOffers(page, part, max) {
    const offers = [];
    const KNOWN_COND = ['NEW', 'REF', 'USED', 'NOB', 'F/S', 'OEMREF', 'ASIS', 'REP'];
    const KNOWN_MFG = ['DELL', 'CISCO', 'JUNIPER', 'HP', 'HPE', 'LENOVO', 'IBM', 'ARISTA', 'NETAPP', 'FORTINET'];

    let rows = await page.$$('tr:has(input[name="partcart[]"])');
    if (!rows.length) {
      // eslint-disable-next-line no-undef
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
      rows = await page.$$('tr:has(input[name="partcart[]"])');
    }

    for (const row of rows) {
      try {
        // Extraction logic (simplified for brevity, but keeping core logic)
        let company = '';
        const compEl = await row.$('.company .compinfo_name');
        if (compEl) company = (await compEl.innerText()).trim();
        if (!company) {
          const compFallback = await row.$('.company');
          if (compFallback) company = (await compFallback.innerText()).replace(/\s+/g, ' ').trim();
        }
        if (!company) continue;

        const tds = await row.$$('td');
        const tdTexts = [];
        for (const td of tds) tdTexts.push(((await td.innerText()) || '').replace(/\s+/g, ' ').trim());

        let location = '';
        const countryRe = /^(USA|GBR|IRL|DEU|FRA|ESP|CAN|CHN|NLD|UAE|SWE|ITA|POL|ISR|DNK)$/;
        for (const td of tds) {
          const cls = await td.getAttribute('class');
          const txt = ((await td.innerText()) || '').replace(/\s+/g, ' ').trim();
          if (cls && cls.includes('search') && countryRe.test(txt)) { location = txt; break; }
        }

        let manufacturer = '';
        let condition = '';
        for (let i = 0; i < tdTexts.length; i++) {
          const txt = tdTexts[i];
          if (KNOWN_MFG.includes(txt.toUpperCase())) {
            manufacturer = txt.toUpperCase();
            const next = tdTexts[i + 1] || '';
            if (KNOWN_COND.includes(next.toUpperCase())) condition = next.toUpperCase();
            break;
          }
        }

        let rawPrice = '';
        const priceAnchor = await row.$('a[rel*="subtype=price"], td.search a[onclick^="xe("]');
        if (priceAnchor) rawPrice = (await priceAnchor.innerText()).trim();
        if (!rawPrice) {
          const rowText = (await row.innerText()) || '';
          const alt = rowText.match(/\$?\s*\d{1,6}(?:\.\d{2})?/);
          if (alt) rawPrice = alt[0].trim();
        }

        const isCall = /CALL/i.test(rawPrice);
        let price = '';
        if (!isCall) {
          const pm = rawPrice.match(/\d+(?:\.\d{2})?/);
          price = pm ? pm[0] : '';
        }

        let qty = '';
        const qtyAnchor = await row.$('a[rel*="subtype=qty"]');
        if (qtyAnchor) {
          const qTxt = (await qtyAnchor.innerText()).trim();
          const qMatch = qTxt.match(/\d+/);
          if (qMatch) qty = qMatch[0];
        } else {
          for (const td of tds) {
            const cls = await td.getAttribute('class');
            const txt = ((await td.innerText()) || '').trim();
            if (cls && cls.includes('search') && /^\d+$/.test(txt)) { qty = txt; break; }
          }
        }

        let age = '';
        for (const td of tds) {
          const cls = await td.getAttribute('class') || '';
          const align = await td.getAttribute('align') || '';
          const txt = ((await td.innerText()) || '').trim();
          if (cls.includes('search') && align === 'center' && /^\d{1,2}$/.test(txt)) { age = txt; break; }
        }

        let description = '';
        const descTd = await row.$('td[colspan]');
        if (descTd) description = ((await descTd.innerText()) || '').replace(/\s+/g, ' ').trim();

        if (!company) continue;
        if (!isCall && !price) continue;

        offers.push({
          part, company, price, raw_price: rawPrice, is_call: isCall ? '1' : '0',
          qty, condition, manufacturer, location, age, description,
          page_url: page.url(), timestamp: new Date().toISOString()
        });

        if (offers.length >= max) break;
      } catch (error) {
        logger.debug('Error extracting offer row: %s', error.message);
      }
    }
    return offers;
  }

  async extractFirstOffer(page, part) {
    // Fallback logic similar to original
    const genericRows = await page.$$('tr');
    for (const gr of genericRows) {
      try {
        const txt = (await gr.innerText()) || '';
        if (!/\d{1,6}(?:\.\d{2})?/.test(txt)) continue;
        const company = (txt.split(/\s{2,}/)[0] || '').trim();
        const priceMatch = txt.match(/\d{1,6}(?:\.\d{2})?/);
        if (!company || !priceMatch) continue;
        return [{
          part, company, price: priceMatch[0], raw_price: priceMatch[0], is_call: '0',
          qty: '', condition: '', manufacturer: '', location: '', age: '', description: '',
          page_url: page.url(), timestamp: new Date().toISOString()
        }];
      } catch (error) {
        logger.debug('Error parsing generic row: %s', error.message);
      }
    }
    return [];
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
    loginWait: opts['login-wait'],
    keepOpen: opts['keep-open'],
    username: opts.username,
    password: opts.password,
  };

  new BrokerBinService(options).run();
}

module.exports = BrokerBinService;
