const BrowserFactory = require('../../src/utils/browser');
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

jest.mock('playwright', () => ({
    chromium: {
        launchPersistentContext: jest.fn(),
    },
}));

jest.mock('fs');

describe('BrowserFactory', () => {
    const mockContext = {
        newPage: jest.fn(),
    };
    const mockPage = {};

    beforeEach(() => {
        jest.clearAllMocks();
        chromium.launchPersistentContext.mockResolvedValue(mockContext);
        mockContext.newPage.mockResolvedValue(mockPage);
        fs.existsSync.mockReturnValue(true);
    });

    it('should launch a persistent context with correct arguments', async () => {
        const profileName = 'test-profile';
        const headless = true;

        const result = await BrowserFactory.create(profileName, headless);

        expect(chromium.launchPersistentContext).toHaveBeenCalledWith(
            expect.stringContaining(profileName),
            expect.objectContaining({
                headless: true,
                viewport: { width: 1280, height: 720 },
            })
        );
        expect(mockContext.newPage).toHaveBeenCalled();
        expect(result).toEqual({ context: mockContext, page: mockPage });
    });

    it('should create profile directory if it does not exist', async () => {
        fs.existsSync.mockReturnValue(false);

        await BrowserFactory.create('new-profile');

        expect(fs.mkdirSync).toHaveBeenCalledWith(
            expect.stringContaining('new-profile'),
            { recursive: true }
        );
    });
});
