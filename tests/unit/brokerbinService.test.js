const BrokerBinService = require('../../src/services/brokerbinService');
const BrowserFactory = require('../../src/utils/browser');
const fs = require('fs');

jest.mock('../../src/utils/browser');
jest.mock('fs');

describe('BrokerBinService', () => {
    let service;
    const mockPage = {
        goto: jest.fn(),
        waitForTimeout: jest.fn(),
        waitForSelector: jest.fn(),
        $: jest.fn(),
        $$: jest.fn().mockResolvedValue([]),
        fill: jest.fn(),
        click: jest.fn(),
        evaluate: jest.fn(),
        waitForNavigation: jest.fn(),
        title: jest.fn().mockResolvedValue('Title'),
        url: jest.fn().mockReturnValue('http://url.com'),
    };
    const mockContext = {
        close: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        BrowserFactory.create.mockResolvedValue({ context: mockContext, page: mockPage });
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue('PART1\nPART2');
        service = new BrokerBinService({ file: 'test.csv', maxParts: 1 });
    });

    it('should read parts from CSV', () => {
        const parts = service.readParts('test.csv');
        expect(parts).toEqual(['PART1', 'PART2']);
    });

    it('should run the search flow', async () => {
        // Mock login button found
        mockPage.$.mockResolvedValueOnce({}); // Login button
        mockPage.waitForSelector.mockResolvedValue(true); // Rows found

        await service.run();

        expect(BrowserFactory.create).toHaveBeenCalled();
        expect(mockPage.goto).toHaveBeenCalledWith('https://www.brokerbin.com/', expect.any(Object));
        expect(mockPage.goto).toHaveBeenCalledWith(expect.stringContaining('partkey'), expect.any(Object));
        expect(mockContext.close).toHaveBeenCalled();
    });
});
