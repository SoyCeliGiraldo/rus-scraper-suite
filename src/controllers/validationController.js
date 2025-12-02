const xlsx = require('xlsx');
const logger = require('../utils/logger');

exports.validateExcel = (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const workbook = xlsx.readFile(req.file.path);
        const sheetNames = workbook.SheetNames;

        // Look for "Other Content" sheet first, otherwise use first sheet
        let targetSheetName = sheetNames.find(name => name.toLowerCase().includes('other content'));
        if (!targetSheetName) {
            targetSheetName = sheetNames[0];
        }

        const worksheet = workbook.Sheets[targetSheetName];

        // Convert to JSON to analyze
        const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length === 0) {
            return res.status(400).json({ error: 'The sheet is empty' });
        }

        // Find the header row (skip empty rows)
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(10, jsonData.length); i++) {
            const row = jsonData[i];
            if (row && row.some(cell => cell && String(cell).toLowerCase().includes('manufacturer'))) {
                headerRowIndex = i;
                break;
            }
        }

        const headerRow = jsonData[headerRowIndex];
        let partColIndex = -1;

        // Look for "Manufacturer (OEM) PN" or similar
        const keywords = ['manufacturer', 'oem', 'pn', 'part', 'sku', 'item', 'numero', 'number', 'mpn'];

        headerRow.forEach((cell, index) => {
            if (typeof cell === 'string') {
                const lower = cell.toLowerCase();
                // Exact match for "Manufacturer (OEM) PN"
                if (lower.includes('manufacturer') && (lower.includes('oem') || lower.includes('pn'))) {
                    partColIndex = index;
                } else if (partColIndex === -1 && keywords.some(k => lower.includes(k))) {
                    partColIndex = index;
                }
            }
        });

        // If no header match, default to first column
        if (partColIndex === -1) {
            partColIndex = 0;
            logger.info('No header match found, defaulting to first column.');
        }

        // Extract preview data (first 5 rows after header)
        const dataRows = jsonData.slice(headerRowIndex + 1);
        const preview = dataRows.slice(0, 5).map(row => row[partColIndex]).filter(Boolean);
        const totalRows = dataRows.filter(row => row[partColIndex]).length;

        res.json({
            isValid: true,
            fileName: req.file.originalname,
            sheetName: targetSheetName,
            detectedColumn: headerRow[partColIndex] || 'Column ' + (partColIndex + 1),
            totalParts: totalRows,
            preview: preview,
            filePath: req.file.path // Send back path so frontend can send it to /run
        });

    } catch (error) {
        logger.error('Error validating Excel: %s', error.message);
        res.status(500).json({ error: 'Failed to process file: ' + error.message });
    }
};
