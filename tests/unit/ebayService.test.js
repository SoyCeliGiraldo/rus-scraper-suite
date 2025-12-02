const EbayService = require('../../src/services/ebayService');
const BrowserFactory = require('../../src/utils/browser');
const StealthBrowserFactory = require('../../src/utils/stealthBrowser');
const fs = require('fs');

jest.mock('../../src/utils/browser');
jest.mock('../../src/utils/stealthBrowser');
jest.mock('fs');

describe('EbayService', () => {
    let service;
    const mockPage = {
        goto: jest.fn(),
        waitForTimeout: jest.fn(),
        waitForSelector: jest.fn(),
        $: jest.fn(),
        $$: jest.fn().mockResolvedValue([]),
        $$eval: jest.fn().mockResolvedValue([]),
        fill: jest.fn(),
        click: jest.fn(),
        evaluate: jest.fn(),
        waitForNavigation: jest.fn(),
        title: jest.fn().mockResolvedValue('eBay Search Result'),
        url: jest.fn().mockReturnValue('https://www.ebay.com/sch/i.html?_nkw=PART1'),
        content: jest.fn().mockResolvedValue('<html></html>'),
    };
    const mockContext = {
        close: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    BrowserFactory.create.mockResolvedValue({ context: mockContext, page: mockPage });
    StealthBrowserFactory.create.mockResolvedValue({ context: mockContext, page: mockPage });
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue('PART1\nPART2');
        // Mock writeFileSync to avoid errors
        fs.writeFileSync.mockImplementation(() => { });
        fs.appendFileSync.mockImplementation(() => { });

    service = new EbayService({ file: 'test.csv', maxParts: 1, delayMs: 0, loginWait: 0, headless: true });
    });

    it('should initialize with correct defaults', () => {
        // offersLimit se parsea a número en BaseScraper
        expect(service.options.offersLimit).toBe(15);
        expect(service.options.outputDir).toContain('ebay_output');
    });

    it('should run the search flow', async () => {
        // Mock successful search
    mockPage.waitForSelector.mockResolvedValue(true);
    await service.run();

    // Se usa StealthBrowserFactory en EbayService
    expect(require('../../src/utils/stealthBrowser').create).toHaveBeenCalledWith('pw-profile-ebay', expect.any(Boolean));
        expect(mockPage.goto).toHaveBeenCalledWith('https://www.ebay.com/', expect.any(Object));
        expect(mockPage.goto).toHaveBeenCalledWith(expect.stringContaining('ebay.com/sch/i.html'), expect.any(Object));
        expect(mockContext.close).toHaveBeenCalled();
    }, 5000);

    it('should attempt login if credentials provided', async () => {
        service = new EbayService({
            file: 'test.csv',
            username: 'user',
            password: 'pass',
            maxParts: 0
        });

        // Mock selectors finding elements with click method
        mockPage.$.mockResolvedValue({ click: jest.fn() });

        await service.handleLogin(mockPage);

        expect(mockPage.fill).toHaveBeenCalledWith('#userid', 'user');
        expect(mockPage.fill).toHaveBeenCalledWith('#pass', 'pass');
    });

    it('should extract offers correctly', async () => {
        const mockOffers = [
            {
                part: 'PART1',
                rank: 1,
                company: 'eBay Seller',
                price: '100.00',
                raw_price: '$100.00',
                is_call: '0',
                qty: '1',
                condition: 'New',
                description: 'Item Title',
                page_url: 'http://item.url',
                timestamp: '2025-01-01'
            }
        ];
        mockPage.$$eval.mockResolvedValue(mockOffers);

        await service.extractAndSaveOffers(mockPage, 'PART1');

        expect(fs.appendFileSync).toHaveBeenCalledWith(
            expect.stringContaining('ebay_offers_detailed.csv'),
            expect.stringContaining('100.00'),
            'utf8'
        );
    });
});
