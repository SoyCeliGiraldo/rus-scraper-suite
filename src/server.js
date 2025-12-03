#!/usr/bin/env node
require('dotenv').config();
const app = require('./app');
const logger = require('./utils/logger');

// Exportar handler compatible con Vercel Functions
module.exports = (req, res) => app(req, res);

// En entorno local, levantar servidor HTTP
if (!process.env.VERCEL) {
  // Modo local: levantar servidor HTTP
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
