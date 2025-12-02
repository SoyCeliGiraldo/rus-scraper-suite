require('dotenv').config();

const config = {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
    brokerbin: {
        user: process.env.BROKERBIN_USER,
        pass: process.env.BROKERBIN_PASS,
    },
    scraper: {
        keepOpenMs: parseInt(process.env.KEEP_OPEN_MS || '20000', 10),
    },
};

// Basic validation
if (!config.brokerbin.user || !config.brokerbin.pass) {
    console.warn('WARNING: BROKERBIN_USER or BROKERBIN_PASS not set in environment variables.');
}

module.exports = config;
