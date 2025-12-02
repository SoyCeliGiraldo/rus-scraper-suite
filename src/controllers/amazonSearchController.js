const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const logger = require('../utils/logger');

exports.runAmazonSearch = async (req, res) => {
    try {
        const { sheetName, columnName, maxParts, delayMs, offersLimit } = req.body;
        const excelPath = req.file?.path;
        if (!excelPath) return res.status(400).json({ error: 'Archivo Excel requerido' });

        const defaultKeepOpenMs = process.env.KEEP_OPEN_MS || '20000';
        const scriptPath = path.join(__dirname, '../services/amazonSearchService.js');

        const args = [
            scriptPath,
            `--file=${excelPath}`,
            sheetName ? `--excel-sheet=${sheetName}` : '',
            columnName ? `--column-name=${columnName}` : '',
            `--max-parts=${(maxParts === undefined || maxParts === '' ? '0' : maxParts)}`,
            `--delay-ms=${delayMs || '1500'}`,
            `--offers-limit=${offersLimit || '3'}`,
            `--keep-open=${defaultKeepOpenMs}`,
            '--save-html',
            '--save-screenshot',
        ].filter(Boolean);

        logger.info(`Starting Amazon search for file: ${excelPath}`);
        const node = spawn(process.execPath, args, { cwd: path.join(__dirname, '../..') });
        let log = '';
        node.stdout.on('data', d => (log += d.toString()));
        node.stderr.on('data', d => (log += d.toString()));

        node.on('close', code => {
            logger.info(`Amazon search finished with code ${code}`);
            const outputDir = path.join(__dirname, '../../amazon_search_output');
            const offersCsv = path.join(outputDir, 'amazon_offers_detailed.csv');
            const offersJson = path.join(outputDir, 'amazon_offers_detailed.json');
            const resultsCsv = path.join(outputDir, 'amazon_results.csv');
            const existsOffers = fs.existsSync(offersCsv);
            const existsOffersJson = fs.existsSync(offersJson);
            const existsResults = fs.existsSync(resultsCsv);

            res.json({
                code,
                log,
                offersCsv: existsOffers ? '/download?file=amazon_search_output/amazon_offers_detailed.csv' : null,
                offersJson: existsOffersJson ? '/download?file=amazon_search_output/amazon_offers_detailed.json' : null,
                resultsCsv: existsResults ? '/download?file=amazon_search_output/amazon_results.csv' : null,
            });
        });
    } catch (e) {
        logger.error(`Error in runAmazonSearch: ${e.message}`);
        res.status(500).json({ error: e.message });
    }
};

// Mirrors scraperController.getOffers but reads from amazon_search_output
exports.getOffers = (req, res) => {
    try {
        const csvPath = path.join(__dirname, '../../amazon_search_output', 'amazon_offers_detailed.csv');
        if (!fs.existsSync(csvPath)) return res.json({ offers: [] });

        const raw = fs.readFileSync(csvPath, 'utf8').trim();
        const lines = raw.split(/\r?\n/);
        if (!lines.length) return res.json({ offers: [] });

        const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const offers = lines.slice(1).filter(l => l.trim()).map(l => {
            const cols = l.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
            const obj = {};
            header.forEach((h, i) => {
                let val = cols[i] || '';
                val = val.trim().replace(/^"|"$/g, '');
                obj[h] = val;
            });

            const toNumber = k => { if (obj[k] && /^\d+(\.\d+)?$/.test(obj[k])) obj[k] = Number(obj[k]); };
            toNumber('price');
            toNumber('raw_price');
            toNumber('qty');
            toNumber('rank');
            toNumber('age');
            obj.is_call = obj.is_call === '1' || obj.is_call === true;
            return obj;
        });

        res.json({ offers, count: offers.length });
    } catch (e) {
        const logger = require('../utils/logger');
        logger.error(`Error in getOffers (amazon): ${e.message}`);
        res.status(500).json({ error: e.message });
    }
};
