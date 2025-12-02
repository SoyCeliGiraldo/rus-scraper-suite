#!/usr/bin/env node
const EbayService = require('../src/services/ebayService');

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

if (!options.file) {
    console.error('Error: --file argument is required (e.g., --file=parts.csv)');
    process.exit(1);
}

new EbayService(options).run();
