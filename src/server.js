#!/usr/bin/env node
require('dotenv').config();
const app = require('./app');
const logger = require('./utils/logger');

// Export express app for Vercel (or other serverless platforms)
module.exports = app;

// Only start the server if NOT running in a serverless environment (like Vercel)
if (!process.env.VERCEL) {
  const port = process.env.PORT || 3000;
  const host = process.env.HOST || '0.0.0.0';

  app.on('error', (err) => {
    logger.error(`Express app error: ${err.message}`);
  });

  const server = app.listen(port, host, () => {
    logger.info(`Server running on http://${host === '0.0.0.0' ? '127.0.0.1' : host}:${port}`);
  });

  server.on('error', (err) => {
    logger.error(`Server listen error: ${err.message}`);
  });
}
