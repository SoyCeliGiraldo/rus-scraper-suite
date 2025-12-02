#!/usr/bin/env node
/**
 * Amazon Search CLI Runner
 * Mirrors BrokerBin CLI flags but targets Amazon product/offer search via Playwright.
 * Usage:
 *  node scripts/runAmazonSearch.js --file=parts.csv --max-parts=50 --offers-limit=3 --delay-ms=1500 --save-html --save-screenshot
 */
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const logger = require('../src/utils/logger');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  args.forEach(arg => {
    if (!arg.startsWith('--')) return;
    const [k,v] = arg.replace(/^--/, '').split('=');
    out[k] = v === undefined ? true : v;
  });
  return out;
}

(async () => {
  const opts = parseArgs();
  const file = opts.file;
  if (!file) {
    console.error('Missing --file=<csv|xlsx>');
    process.exit(1);
  }
  if (!fs.existsSync(file)) {
    console.error('Input file not found: ' + file);
    process.exit(1);
  }

  const scriptPath = path.join(__dirname, '../src/services/amazonSearchService.js');
  const args = [
    scriptPath,
    `--file=${file}`,
    `--max-parts=${opts['max-parts'] || '0'}`,
    `--offers-limit=${opts['offers-limit'] || '3'}`,
    `--delay-ms=${opts['delay-ms'] || '1500'}`,
    opts['save-html'] ? '--save-html' : '',
    opts['save-screenshot'] ? '--save-screenshot' : '',
    opts['auto-login'] ? '--auto-login' : '',
    opts['login-wait-ms'] ? `--login-wait=${opts['login-wait-ms']}` : '',
    opts['region'] ? `--region=${opts['region']}` : '',
    opts['business'] ? '--business' : '',
    opts['headless'] !== undefined ? `--headless=${opts['headless']}` : '',
    opts['user-agent'] ? `--user-agent=${JSON.stringify(opts['user-agent'])}` : '',
  ].filter(Boolean);

  logger.info('Starting Amazon search CLI', { file });
  const node = spawn(process.execPath, args, { cwd: path.join(__dirname, '..') });
  node.stdout.on('data', d => process.stdout.write(d));
  node.stderr.on('data', d => process.stderr.write(d));
  node.on('close', code => {
    logger.info(`Amazon search CLI finished with code ${code}`);
    process.exit(code);
  });
})();
