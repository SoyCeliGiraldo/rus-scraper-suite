const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

// Folder structure
const AMEX_ROOT = path.join(process.cwd(), 'Amex Bill');
const AMEX_INCOMING = path.join(AMEX_ROOT, 'incoming');
const AMEX_LOGS = path.join(AMEX_ROOT, 'activity logs');
const AMEX_RESULTS = path.join(AMEX_ROOT, 'results');

const JSON_DIR = path.join(process.cwd(), 'amazon_invoices_json');

// Ensure folders exist
for (const dir of [AMEX_INCOMING, AMEX_LOGS, AMEX_RESULTS]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function main() {
  console.log("=== MATCHING AMEX BILL TO AMAZON INVOICES ===");

  // 1) Find newest Excel file in /incoming
  const files = fs
    .readdirSync(AMEX_INCOMING)
    .filter(f => f.toLowerCase().endsWith('.xlsx'));

  if (!files.length) {
    console.error(`❌ No Excel files found in: ${AMEX_INCOMING}`);
    process.exit(1);
  }

  const withStats = files.map(name => {
    const fullPath = path.join(AMEX_INCOMING, name);
    const stat = fs.statSync(fullPath);
    return { name, fullPath, mtimeMs: stat.mtimeMs };
  });

  withStats.sort((a, b) => b.mtimeMs - a.mtimeMs);
  const latest = withStats[0];

  console.log("Using input file:", latest.fullPath);

  // 2) Read workbook
  const wb = xlsx.readFile(latest.fullPath);

  // 3) Auto-detect the correct sheet (Date | Description | Amount)
  let sheetName = null;

  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    if (!sheet) continue;

    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
    if (!rows.length) continue;

    const headerIndex = rows.findIndex(
      r => r[0] === 'Date' && r[1] === 'Description' && r[2] === 'Amount'
    );

    if (headerIndex !== -1) {
      sheetName = name;
      break;
    }
  }

  if (!sheetName) {
    console.error("❌ No sheet found with Date | Description | Amount.");
    process.exit(1);
  }

  console.log("Extracting data from sheet:", sheetName);

  let sheet = wb.Sheets[sheetName];
  let rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });

  // Find header row
  const headerIndex = rows.findIndex(
    r => r[0] === 'Date' && r[1] === 'Description' && r[2] === 'Amount'
  );

  const header = rows[headerIndex];

  // Create "Amazon Order ID" column if not present
  let orderIdColIndex = header.findIndex(x => x === "Amazon Order ID");
  if (orderIdColIndex === -1) {
    orderIdColIndex = header.length;
    header[orderIdColIndex] = "Amazon Order ID";
  }

  // 4) Load invoice JSONs
  const jsonFiles = fs.readdirSync(JSON_DIR).filter(f => f.endsWith(".json"));
  const invoices = jsonFiles.map(file => {
    const data = JSON.parse(fs.readFileSync(path.join(JSON_DIR, file), "utf8"));
    return {
      orderId: data.orderId,
      amount: data.total,
      method: (data.paymentMethodText || "").toUpperCase(),
      file
    };
  });

  // Keep only AmEx ending in 1001
  const invoices1001 = invoices.filter(i =>
    i.method.includes("AMERICAN EXPRESS") &&
    i.method.includes("ENDING IN 1001")
  );

  console.log(`Found ${invoices1001.length} invoices charged to AmEx 1001.`);

  // 5) Collect Amex Amazon rows
  const amexRows = [];

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[1] || !row[2]) continue;

    const desc = String(row[1]).toUpperCase();
    let amt = row[2];

    if (typeof amt !== "number") {
      amt = parseFloat(String(amt).replace(/[^0-9.-]/g, ""));
    }
    if (isNaN(amt)) continue;

    // Amex negative charges → convert to positive
    amt = Math.abs(amt);

    if (
      desc.includes("AMAZON") ||
      desc.includes("AMZN.COM") ||
      desc.includes("MARKETPLACE")
    ) {
      amexRows.push({
        index: i,
        amount: amt,
        description: row[1]
      });
    }
  }

  console.log(`Found ${amexRows.length} Amazon charges in the Amex file.`);

  // 6) Match invoices to Amex rows
  const usedAmex = new Set();

  for (const inv of invoices1001) {
    const match = amexRows.find(r =>
      !usedAmex.has(r.index) &&
      Math.abs(r.amount - inv.amount) < 0.01
    );

    if (match) {
      rows[match.index][orderIdColIndex] = inv.orderId;
      usedAmex.add(match.index);

      console.log(`Matched ${inv.orderId} → Row ${match.index + 1} ($${match.amount})`);
    } else {
      console.log(`⚠ No match found for ${inv.orderId} ($${inv.amount})`);
    }
  }

  // 7) Write updated Excel to /results
  const outRowsSheet = xlsx.utils.aoa_to_sheet(rows);
  wb.Sheets[sheetName] = outRowsSheet;

  const resultName = latest.name.replace(/\.xlsx$/i, "-with-orders.xlsx");
  const resultPath = path.join(AMEX_RESULTS, resultName);

  xlsx.writeFile(wb, resultPath);

  console.log("Output file written to:", resultPath);

  // 8) Move original into /activity logs
  const archivedPath = path.join(AMEX_LOGS, latest.name);

  fs.renameSync(latest.fullPath, archivedPath);
  console.log("Archived original file to:", archivedPath);

  console.log("=== MATCHING COMPLETE ===");
}

main();
