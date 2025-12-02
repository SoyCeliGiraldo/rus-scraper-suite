// Adapter to parse eBay offers from HTML string for offline tests
// Use cheerio to avoid Jest ESM transform issues with jsdom/parse5
const cheerio = require('cheerio');

function parseOffers(html, { partNum, limit = 15 } = {}) {
  const $ = cheerio.load(html);
  const $items = $('.s-item');
  const results = [];
  $items.each((_, el) => {
    if (results.length >= limit) return false; // break
    const $el = $(el);
    const title = $el.find('.s-item__title').text().trim();
    if (!title || title.includes('Shop on eBay')) return;
    const rawPrice = $el.find('.s-item__price').text().trim();
    const url = $el.find('.s-item__link').attr('href') || '';
    const condition = $el.find('.s-item__subtitle .SECONDARY_INFO').text().trim() || 'Used';
    const shipping = $el.find('.s-item__shipping').text().trim();

    if (rawPrice) {
      results.push({
        part: partNum,
        rank: results.length + 1,
        company: 'eBay Seller',
        price: rawPrice.replace(/[$,]/g, ''),
        raw_price: rawPrice,
        is_call: '0',
        qty: '1',
        condition,
        manufacturer: '',
        location: '',
        age: '',
        description: `${title} ${shipping}`,
        page_url: url,
        timestamp: new Date().toISOString()
      });
    }
  });
  return results;
}

module.exports = { parseOffers };
