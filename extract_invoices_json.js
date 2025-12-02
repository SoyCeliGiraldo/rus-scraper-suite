const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const INVOICE_PDF_DIR = path.join(process.cwd(), 'amazon_invoices');
const JSON_OUT_DIR = path.join(process.cwd(), 'amazon_invoices_json');

async function main() {
  // Ensure output folder exists
  if (!fs.existsSync(JSON_OUT_DIR)) fs.mkdirSync(JSON_OUT_DIR);

  // Use the same persistent profile as your invoice-downloader script
  const userDataDir = path.join(process.cwd(), 'pw-profile');

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
  });

  const page = await context.newPage();

  console.log('Scanning invoice PDFs in:', INVOICE_PDF_DIR);

  const files = fs
    .readdirSync(INVOICE_PDF_DIR)
    .filter(f => f.toLowerCase().endsWith('.pdf'));

  if (!files.length) {
    console.error('No PDF invoices found in amazon_invoices folder.');
    await context.close();
    return;
  }

  for (const file of files) {
    // Expect filenames like: invoice-111-2222222-3333333.pdf
    const m = file.match(/^invoice-(\d{3}-\d{7}-\d{7})\.pdf$/);
    if (!m) {
      console.log(`Skipping file with unexpected name: ${file}`);
      continue;
    }

    const orderId = m[1];

    const jsonPath = path.join(JSON_OUT_DIR, `invoice-${orderId}.json`);
    if (fs.existsSync(jsonPath)) {
      console.log(`JSON already exists for order ${orderId}, skipping.`);
      continue;
    }

    const invoiceUrl = `https://www.amazon.com/gp/css/summary/print.html?orderID=${orderId}`;

    console.log(`Opening invoice for order ${orderId} -> ${invoiceUrl}`);
    await page.goto(invoiceUrl, { waitUntil: 'domcontentloaded' });

    // Get full body text for regex searches
    const bodyText = await page.innerText('body');

    // Try to extract totals
    let total = null;
    const totalPatterns = [
      /Order Total[^0-9]*([\d,]+\.\d{2})/,
      /Grand Total[^0-9]*([\d,]+\.\d{2})/,
      /Total[^0-9]*([\d,]+\.\d{2})/,
    ];

    for (const regex of totalPatterns) {
      const match = bodyText.match(regex);
      if (match && match[1]) {
        const numeric = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(numeric)) {
          total = numeric;
          break;
        }
      }
    }

    // Payment method text (grab the visible text of that component if present)
    let paymentMethodText = null;
    try {
      const pmLocator =
        '.pmts-payments-instrument-detail-box-paystationpaymentmethod';
      const pmHandle = await page.$(pmLocator);
      if (pmHandle) {
        paymentMethodText = (await pmHandle.innerText()).trim();
      }
    } catch {
      // ignore
    }

    // Try to grab order date (best-effort)
    let orderDate = null;
    try {
      // Sometimes it's shown as "Order placed" or similar
      const dateMatch = bodyText.match(/Order placed[^A-Za-z0-9]*([A-Za-z]+\s+\d{1,2},\s+\d{4})/);
      if (dateMatch && dateMatch[1]) {
        orderDate = dateMatch[1];
      }
    } catch {
      // ignore
    }

    const data = {
      orderId,
      invoiceUrl,
      total,
      paymentMethodText,
      orderDate,
      scrapedAt: new Date().toISOString(),
    };

    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Saved JSON for order ${orderId} -> ${jsonPath}`);

    // Small delay between invoices
    await page.waitForTimeout(1500);
  }

  console.log('Done converting invoices to JSON.');
  await context.close();
}

main().catch(err => {
  console.error('Error in extract_invoices_json.js:', err);
  process.exit(1);
});
