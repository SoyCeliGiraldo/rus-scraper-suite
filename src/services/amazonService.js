const fs = require('fs');
const path = require('path');
const BrowserFactory = require('../utils/browser');
const logger = require('../utils/logger');
const { sanitizeObject } = require('../utils/secrets');

/**
 * Amazon Invoice Scraper Service
 */
class AmazonService {
  constructor(options = {}) {
    this.options = {
      maxPages: parseInt(options.maxPages || '20', 10),
      headless: !!options.headless,
      onlyNew: !!options.onlyNew,
      loginWait: parseInt(options.loginWait || '10000', 10),
      delayMs: parseInt(options.delayMs || '1500', 10),
      cardBrand: options.cardBrand,
      cardLast4: options.cardLast4,
      amex: !!options.amex,
      outputDir: options.outputDir || path.join(process.cwd(), 'amazon_invoices'),
      // Auto-login (opcional)
      email: options.email || process.env.AMAZON_EMAIL || '',
      password: options.password || process.env.AMAZON_PASSWORD || '',
      autoLogin: options.autoLogin === true || options.autoLogin === 'true',
    };

    if (this.options.amex) {
      this.options.cardBrand = this.options.cardBrand || 'American Express';
      this.options.cardLast4 = this.options.cardLast4 || '1001';
    }

    this.useCardFilter = !!(this.options.cardBrand && this.options.cardLast4);
    this.cardLast4Phrase = this.options.cardLast4 ? `ending in ${this.options.cardLast4}` : null;
  }

  async run() {
    logger.info('=== Amazon Invoices Runner ===');
  logger.info('Options: %o', sanitizeObject(this.options));

    let context, page;

    try {
      ({ context, page } = await BrowserFactory.create('pw-profile', this.options.headless));

      logger.info('Opening Amazon homepage...');
      await page.goto('https://www.amazon.com/', { waitUntil: 'domcontentloaded' });

      // Intento de auto-login si hay credenciales
      if (this.options.autoLogin && this.options.email && this.options.password) {
        await this.tryAutoLogin(page);
      } else {
        logger.info(`Auto-login no activo o sin credenciales. Esperando ${this.options.loginWait}ms para login manual...`);
        await page.waitForTimeout(this.options.loginWait);
      }

      logger.info('Navigating to Your Orders...');
      await page.goto('https://www.amazon.com/gp/css/order-history', { waitUntil: 'domcontentloaded' });

      if (!fs.existsSync(this.options.outputDir)) {
        fs.mkdirSync(this.options.outputDir, { recursive: true });
      }

      // Load existing IDs
      const existingOrderIds = this.getExistingOrderIds();
      logger.info(`Existing invoices found: ${existingOrderIds.size}`);

      // Collect Links
      const candidateLinks = await this.collectLinks(page, existingOrderIds);

      if (!candidateLinks.length) {
        logger.info('No invoices to download with current filters.');
        return;
      }

      // Download PDFs
      await this.downloadInvoices(page, candidateLinks);

    } catch (error) {
      logger.error('Fatal Error: %s', error.message);
    } finally {
      logger.info('=== Process Completed ===');
      if (context) await context.close();
    }
  }

  getExistingOrderIds() {
    const existingFiles = fs.readdirSync(this.options.outputDir);
    const invoiceFileRegex = /^invoice-(\d{3}-\d{7}-\d{7})\.pdf$/;
    const existingOrderIds = new Set();
    for (const f of existingFiles) {
      const m = f.match(invoiceFileRegex);
      if (m) existingOrderIds.add(m[1]);
    }
    return existingOrderIds;
  }

  async collectLinks(page, existingOrderIds) {
    const allLinks = new Set();

    for (let pageNum = 1; pageNum <= this.options.maxPages; pageNum++) {
      logger.info(`Scanning orders page ${pageNum}...`);
      await page.waitForTimeout(1500); // Wait for lazy load

      const links = await page.$$eval('a', as =>
        as.map(a => a.href).filter(h => h && h.includes('/gp/css/summary/print.html?orderID='))
      );

      logger.info(`Found ${links.length} invoice links on page ${pageNum}`);
      links.forEach(l => allLinks.add(l));

      const next = await page.$('li.a-last a');
      if (!next) {
        logger.info('No Next button, pagination finished.');
        break;
      }
      logger.info('Advancing to next page...');
      await Promise.all([next.click(), page.waitForNavigation({ waitUntil: 'domcontentloaded' })]);
    }

    const uniqueLinks = Array.from(allLinks);
    logger.info(`Total unique links collected: ${uniqueLinks.length}`);

    // Filter New
    let candidateLinks = uniqueLinks.filter(link => {
      try {
        const u = new URL(link);
        const orderId = u.searchParams.get('orderID');
        if (!orderId) return false;
        if (this.options.onlyNew && existingOrderIds.has(orderId)) return false;
        return true;
      } catch { return false; }
    });
    logger.info(`Candidates after ONLY_NEW filter: ${candidateLinks.length}`);

    // Filter Card
    if (this.useCardFilter) {
      candidateLinks = await this.filterByCard(page, candidateLinks);
    }

    return candidateLinks;
  }

  async filterByCard(page, links) {
    logger.info(`Applying card filter: brand="${this.options.cardBrand}" last4="${this.options.cardLast4}"`);
    const filtered = [];
    for (const link of links) {
      await page.goto(link, { waitUntil: 'domcontentloaded' });
      const bodyText = await page.innerText('body');
      const passesBrand = bodyText.includes(this.options.cardBrand);
      const passesLast4 = this.cardLast4Phrase ? bodyText.includes(this.cardLast4Phrase) : true;

      if (passesBrand && passesLast4) {
        filtered.push(link);
        logger.info('✔ Card match: %s', link);
      } else {
        logger.info('✖ No card match, skipping: %s', link);
      }
      await page.waitForTimeout(500);
    }
    logger.info(`Links after card filter: ${filtered.length}`);
    return filtered;
  }

  async downloadInvoices(page, links) {
    for (const link of links) {
      await page.goto(link, { waitUntil: 'domcontentloaded' });
      const u = new URL(link);
      const orderId = u.searchParams.get('orderID') || 'unknown';
      const filePath = path.join(this.options.outputDir, `invoice-${orderId}.pdf`);

      if (fs.existsSync(filePath) && this.options.onlyNew) {
        logger.info(`(skip) Already exists: ${filePath}`);
        continue;
      }

      logger.info(`Saving PDF -> ${filePath}`);
      await page.pdf({ path: filePath, format: 'A4', printBackground: true });
      await page.waitForTimeout(this.options.delayMs);
    }
  }

  async tryAutoLogin(page) {
    try {
      logger.info('Intentando auto-login Amazon (facturas)...');
      await page.goto('https://www.amazon.com/ap/signin', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(800);
      const emailSel = '#ap_email, input[name="email"]';
      const contSel = '#continue, input#continue, button[name="continue"]';
      const passSel = '#ap_password, input[name="password"]';
      const submitSel = '#signInSubmit, input#signInSubmit, button[type="submit"]';

      if (await page.$(emailSel)) {
        await page.fill(emailSel, this.options.email);
        if (await page.$(contSel)) {
          await Promise.all([
            page.click(contSel),
            page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {})
          ]);
        }
      } else {
        logger.info('Campo email no encontrado (ya logueado?).');
      }

      if (await page.$(passSel)) {
        await page.fill(passSel, this.options.password);
        if (await page.$(submitSel)) {
          await Promise.all([
            page.click(submitSel),
            page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {})
          ]);
        }
        logger.info('Auto-login enviado.');
      } else {
        logger.info('Campo password no presente (MFA/captcha o sesión previa).');
      }

      await page.waitForTimeout(1500);
      const acct = await page.$('#nav-link-accountList');
      if (acct) {
        logger.info('Auto-login probablemente exitoso (link cuenta visible).');
      } else {
        logger.info('No se confirmó login; continuar con flujo manual si es necesario.');
      }
    } catch (e) {
      logger.warn(`Fallo auto-login: ${e.message}`);
      logger.info(`Continuando con espera manual ${this.options.loginWait}ms...`);
      await page.waitForTimeout(this.options.loginWait);
    }
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

  // Map CLI args to options
  const options = {
    maxPages: opts['max-pages'],
    headless: opts.headless,
    onlyNew: opts['only-new'],
    loginWait: opts['login-wait'],
    delayMs: opts['delay-ms'],
    cardBrand: opts['card-brand'],
    cardLast4: opts['card-last4'],
    amex: opts.amex,
    email: opts.email,
    password: opts.password,
    autoLogin: opts['auto-login'],
  };

  new AmazonService(options).run();
}

module.exports = AmazonService;
