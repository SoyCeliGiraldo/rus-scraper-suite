const AmazonService = require('../../src/services/amazonService');
const BrowserFactory = require('../../src/utils/browser');
const logger = require('../../src/utils/logger');

jest.mock('../../src/utils/browser');
jest.mock('../../src/utils/logger');

describe('AmazonService', () => {
    let service;
    const mockPage = {
        goto: jest.fn(),
        waitForTimeout: jest.fn(),
        $$eval: jest.fn(),
        $: jest.fn(),
        pdf: jest.fn(),
        innerText: jest.fn(),
    };
    const mockContext = {
        close: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        BrowserFactory.create.mockResolvedValue({ context: mockContext, page: mockPage });
        service = new AmazonService({ maxPages: 1, headless: true });
    });

    it('should initialize with default options', () => {
        expect(service.options.maxPages).toBe(1);
        expect(service.options.headless).toBe(true);
    });

    it('should run the scraping flow', async () => {
        // Mock collecting links
        mockPage.$$eval.mockResolvedValue(['https://amazon.com/invoice?orderID=123']);

        await service.run();

        expect(BrowserFactory.create).toHaveBeenCalled();
        expect(mockPage.goto).toHaveBeenCalledWith('https://www.amazon.com/', expect.any(Object));
        expect(mockPage.goto).toHaveBeenCalledWith('https://www.amazon.com/gp/css/order-history', expect.any(Object));
        expect(mockPage.pdf).toHaveBeenCalled();
        expect(mockContext.close).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
        const error = new Error('Test Error');
        BrowserFactory.create.mockRejectedValue(error);

        await service.run();

        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Fatal Error'), expect.any(String));
    });
});
