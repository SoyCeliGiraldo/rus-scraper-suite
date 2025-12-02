const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const BrowserFactory = require('../utils/browser');
const logger = require('../utils/logger');
const { sanitizeObject } = require('../utils/secrets');

/**
 * Base Scraper Class
 * Encapsulates common logic for file reading, CSV management, and browser initialization.
 */
class BaseScraper {
    constructor(options = {}) {
        this.options = {
            ...options, // Allow overrides first, then sanitize/process specific keys
            file: options.file,
            columnIndex: parseInt(options.columnIndex || '0', 10),
            columnName: options.columnName,
            skipHeader: !!options.skipHeader,
            sheetName: options.sheetName,
            maxParts: parseInt(options.maxParts || '0', 10),
            offersLimit: parseInt(options.offersLimit || '15', 10),
            delayMs: parseInt(options.delayMs || '1500', 10),
            headless: options.headless !== false && options.headless !== 'false',
            outputDir: options.outputDir || path.join(process.cwd(), 'output'),
            saveHtml: options.saveHtml === true || options.saveHtml === 'true',
            saveScreenshot: options.saveScreenshot === true || options.saveScreenshot === 'true',
            keepOpen: parseInt(options.keepOpen || '0', 10),
            loginWait: parseInt(options.loginWait || '10000', 10),
            email: options.email || '',
            password: options.password || '',
            username: options.username || '',
        };

        if (!fs.existsSync(this.options.outputDir)) {
            fs.mkdirSync(this.options.outputDir, { recursive: true });
        }

        this.resultsCsv = path.join(this.options.outputDir, 'results.csv'); // Default, can be overridden
        this.offersCsv = path.join(this.options.outputDir, 'offers_detailed.csv'); // Default, can be overridden
    }

    /**
     * Main execution method. Should be called by subclasses.
     * Subclasses should implement `processPart` and `handleLogin`.
     */
    async run(profileName, startUrl) {
        logger.info(`=== ${this.constructor.name} Started ===`);
        logger.info('Options: %o', sanitizeObject(this.options));

        const parts = this.readParts(this.options.file);
        const uniqueParts = [...new Set(parts.map(p => String(p).trim()))].filter(Boolean);
        logger.info(`Total unique parts: ${uniqueParts.length}`);

        const slice = this.options.maxParts > 0 ? uniqueParts.slice(0, this.options.maxParts) : uniqueParts;
        logger.info(`Processing: ${slice.length}`);

        this.initializeCsvs();

        let context, page;

        try {
            ({ context, page } = await BrowserFactory.create(profileName, this.options.headless));

            if (startUrl) {
                logger.info(`Opening ${startUrl}...`);
                await page.goto(startUrl, { waitUntil: 'domcontentloaded' });
            }

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

    /**
     * To be implemented by subclasses
     */
    async handleLogin(page) {
        logger.warn('handleLogin not implemented in subclass');
    }

    /**
     * To be implemented by subclasses
     */
    async processPart(page, part) {
        throw new Error('processPart must be implemented by subclass');
    }

    readParts(filePath) {
        if (!filePath || !fs.existsSync(filePath)) {
            logger.error('File not found: %s', filePath);
            // We don't exit process here to allow testing, but in CLI it might be fatal
            throw new Error(`File not found: ${filePath}`);
        }

        const ext = path.extname(filePath).toLowerCase();
        if (ext === '.csv') {
            return this.readCsv(filePath);
        } else if (ext === '.xlsx' || ext === '.xls') {
            return this.readExcel(filePath);
        } else {
            throw new Error(`Unsupported file type: ${ext}`);
        }
    }

    readCsv(filePath) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split(/\r?\n/).filter(l => l.trim());

        if (!this.options.skipHeader) return lines;
        if (lines.length <= 1) return lines;

        // Heuristic: if first line has "part", "sku", etc, it's likely a header
        const first = lines[0].toLowerCase();
        const looksHeader = /(part|pn|sku|item|number)/.test(first) && first.length < 50;

        return looksHeader ? lines.slice(1) : lines;
    }

    readExcel(filePath) {
        const workbook = xlsx.readFile(filePath);
        const sheetName = this.options.sheetName || workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

        let colIndex = 0;
        if (this.options.columnName) {
            const headerRow = jsonData[0] || [];
            colIndex = headerRow.findIndex(h => String(h).toLowerCase().includes(this.options.columnName.toLowerCase()));
            if (colIndex === -1) colIndex = 0;
        } else if (this.options.columnIndex) {
            colIndex = parseInt(this.options.columnIndex, 10);
        }

        const startRow = this.options.skipHeader ? 1 : 0;
        return jsonData.slice(startRow).map(row => row[colIndex]).filter(Boolean);
    }

    initializeCsvs() {
        if (!fs.existsSync(this.resultsCsv)) {
            fs.writeFileSync(this.resultsCsv, 'part,page_title,url,timestamp\n', 'utf8');
        }
        // Default header, subclasses can override or ensure consistency
        if (!fs.existsSync(this.offersCsv)) {
            fs.writeFileSync(this.offersCsv, 'part,rank,company,price,raw_price,is_call,qty,condition,manufacturer,location,age,description,page_url,timestamp\n', 'utf8');
        }
    }

    appendCsv(file, arr) {
        const line = arr.map(v => {
            const s = v == null ? '' : String(v);
            return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
        }).join(',') + '\n';
        fs.appendFileSync(file, line, 'utf8');
    }

    saveResults(pageTitle, pageUrl, part) {
        const ts = new Date().toISOString();
        const line = `${JSON.stringify(part)},${JSON.stringify(pageTitle)},${JSON.stringify(pageUrl)},${ts}\n`;
        fs.appendFileSync(this.resultsCsv, line, 'utf8');
    }

    generateJsonOutput() {
        try {
            if (!fs.existsSync(this.offersCsv)) return;

            const csvContent = fs.readFileSync(this.offersCsv, 'utf8').trim();
            const lines = csvContent.split(/\r?\n/);

            if (lines.length <= 1) return;

            const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
            const offers = [];

            for (let i = 1; i < lines.length; i++) {
                const line = lines[i];
                if (!line.trim()) continue;

                // Simple CSV split handling quoted commas
                const cols = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
                const offer = {};

                headers.forEach((header, index) => {
                    let value = cols[index] || '';
                    value = value.trim().replace(/^"|"$/g, '');
                    offer[header] = value;
                });

                offers.push(offer);
            }

            const jsonPath = this.offersCsv.replace('.csv', '.json');
            fs.writeFileSync(jsonPath, JSON.stringify(offers, null, 2), 'utf8');
            logger.info(`JSON output generated: ${jsonPath}`);
        } catch (error) {
            logger.error('Error generating JSON: %s', error.message);
        }
    }
}

module.exports = BaseScraper;
