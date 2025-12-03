const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const scraperRoutes = require('./routes/scraperRoutes');
const amazonSearchRoutes = require('./routes/amazonSearchRoutes');
const amazonInvoiceRoutes = require('./routes/amazonInvoiceRoutes');
const kpiRoutes = require('./routes/kpiRoutes');

const app = express();

// Security Middleware
// Relax CSP to allow inline scripts used for Safari polyfills
app.use(helmet({ contentSecurityPolicy: false }));
// CORS restricted by ALLOWED_ORIGINS (comma separated), defaults to '*'
// CORS restricted by ALLOWED_ORIGINS (comma separated), defaults to '*'
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '*').split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return cb(null, true);
    // Allow Vercel deployments
    if (origin.endsWith('.vercel.app')) return cb(null, true);
    cb(new Error('CORS not allowed'));
  },
  credentials: true
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Standard Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/v1/scraper', scraperRoutes);
app.use('/api/v1/amazon-search', amazonSearchRoutes);
app.use('/api/v1/amazon-invoices', amazonInvoiceRoutes);
app.use('/api/v1/kpi', kpiRoutes);

// Download Route (must be before catch-all)
app.get('/download', (req, res) => {
  const rel = req.query.file;
  // Security check to prevent directory traversal
  if (!rel || rel.includes('..')) return res.status(400).send('Invalid file path');
  // Whitelist folders allowed to download from
  const allowed = [
    'amazon-invoice-bot/amazon_search_output',
    'amazon-invoice-bot/brokerbin_output',
    'amazon-invoice-bot/ebay_output',
    'amazon-invoice-bot/amazon_invoices',
  ];

  // In Vercel, we might be serving from /tmp
  if (process.env.VERCEL) {
    // Allow downloading from /tmp
    if (!rel.startsWith('/tmp') && !allowed.some(prefix => rel.startsWith(prefix))) {
      // If it doesn't start with /tmp and isn't in allowed list, check if we can map it to /tmp
      // This is a simplification; in a real app you'd map the requested ID to a temp file
    }
  }

  const isAllowed = allowed.some(prefix => rel.startsWith(prefix)) || (process.env.VERCEL && rel.startsWith('/tmp'));

  if (!isAllowed) return res.status(403).send('Download not allowed from this path');

  let abs = path.join(__dirname, '..', rel);

  // If on Vercel and path doesn't exist in project root, check /tmp
  if (process.env.VERCEL && !fs.existsSync(abs)) {
    const tmpPath = path.join('/tmp', path.basename(rel));
    if (fs.existsSync(tmpPath)) {
      abs = tmpPath;
    }
  }

  if (!fs.existsSync(abs)) return res.status(404).send('Archivo no encontrado');
  res.download(abs);
});

// Serve React Frontend in Production
const clientBuildPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath, {
    setHeaders: (res, filePath) => {
      // Avoid Safari caching stale bundles
      res.setHeader('Cache-Control', 'no-cache');
    }
  }));
  app.get('*', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Error Handling Middleware
app.use((err, req, res, next) => {
  const logger = require('./utils/logger');
  logger.error(err.stack);
  res.status(500).send('Something broke!');
});

module.exports = app;
