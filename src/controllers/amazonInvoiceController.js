const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { createJob, appendLog, setStatus, getJob, listJobs } = require('../jobs/jobRegistry');
const logger = require('../utils/logger');

exports.runInvoices = (req, res) => {
  try {
    const { maxPages, onlyNew, amex, cardBrand, cardLast4, headless } = req.body;
    const job = createJob({ type: 'amazon-invoices', maxPages, onlyNew, amex, cardBrand, cardLast4 });
    setStatus(job.id, 'running');

    const scriptPath = path.join(__dirname, '../services/amazonService.js');
    const args = [
      scriptPath,
      maxPages ? `--max-pages=${maxPages}` : '',
      onlyNew ? '--only-new' : '',
      amex ? '--amex' : '',
      cardBrand ? `--card-brand=${cardBrand}` : '',
      cardLast4 ? `--card-last4=${cardLast4}` : '',
      headless !== undefined ? `--headless=${headless}` : '',
      '--auto-login'
    ].filter(Boolean);

    logger.info(`Starting Amazon invoices job ${job.id}`);
    const child = spawn(process.execPath, args, { cwd: path.join(__dirname, '../..') });

    child.stdout.on('data', d => appendLog(job.id, d.toString()));
    child.stderr.on('data', d => appendLog(job.id, d.toString()));

    child.on('close', code => {
      if (code === 0) setStatus(job.id, 'finished');
      else setStatus(job.id, 'error', `Process exited with code ${code}`);
      logger.info(`Amazon invoices job ${job.id} finished with code ${code}`);
    });

    res.json({ jobId: job.id, status: job.status });
  } catch (e) {
    logger.error(`Error starting invoice job: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
};

exports.jobStatus = (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json({ id: job.id, status: job.status, invoices: job.counters.invoices, log: job.log.slice(-4000), error: job.error });
};

exports.listJobs = (req, res) => {
  res.json({ jobs: listJobs() });
};

exports.listInvoices = (req, res) => {
  const dir = path.join(__dirname, '../../amazon_invoices');
  if (!fs.existsSync(dir)) return res.json({ invoices: [] });
  const files = fs.readdirSync(dir).filter(f => /^invoice-.*\.pdf$/.test(f));
  res.json({ invoices: files });
};

exports.downloadInvoice = (req, res) => {
  const id = req.params.id; // expecting invoice-<orderId>.pdf
  if (!/^invoice-.*\.pdf$/.test(id)) return res.status(400).json({ error: 'Invalid invoice id' });
  const abs = path.join(__dirname, '../../amazon_invoices', id);
  if (!fs.existsSync(abs)) return res.status(404).json({ error: 'Not found' });
  res.download(abs);
};