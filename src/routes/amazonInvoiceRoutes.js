const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/amazonInvoiceController');
const { validateAmazonInvoices } = require('../middleware/validators');
const authApiKey = require('../middleware/authApiKey');

router.post('/run', authApiKey, validateAmazonInvoices, ctrl.runInvoices);
router.get('/jobs', ctrl.listJobs);
router.get('/jobs/:id', ctrl.jobStatus);
router.get('/invoices', ctrl.listInvoices);
router.get('/invoices/:id/download', ctrl.downloadInvoice);

module.exports = router;