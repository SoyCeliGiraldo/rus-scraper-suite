const express = require('express');
const router = express.Router();
const { listJobs } = require('../jobs/jobRegistry');

router.get('/', async (req, res) => {
  try {
    const jobs = await listJobs();
    const totalJobs = jobs.length;
    const finished = jobs.filter(j => j.status === 'finished').length;
    const running = jobs.filter(j => j.status === 'running').length;
    const errors = jobs.filter(j => j.status === 'error').length;
    const invoices = jobs.reduce((sum, j) => sum + (j.invoices || 0), 0);

    res.json({
      totalJobs,
      running,
      finished,
      errors,
      invoicesDownloaded: invoices,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
