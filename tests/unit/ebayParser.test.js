const fs = require('fs');
const path = require('path');
const { parseOffers } = require('../../src/adapters/ebayParser');

describe('eBay Parser Adapter', () => {
  it('should parse offers from sample HTML', () => {
    const html = fs.readFileSync(path.join(__dirname, '../fixtures/ebay_sample.html'), 'utf8');
    const offers = parseOffers(html, { partNum: 'ASA5506-K9', limit: 2 });
    expect(offers.length).toBe(2);
    expect(offers[0].price).toBe('100.00');
    expect(offers[1].price).toBe('80.00');
    expect(offers[0].description).toContain('Free shipping');
  });
});
