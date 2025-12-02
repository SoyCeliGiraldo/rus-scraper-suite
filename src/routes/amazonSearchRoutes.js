const express = require('express');
const router = express.Router();
const amazonSearchController = require('../controllers/amazonSearchController');
const validationController = require('../controllers/validationController');
const { validateAmazonSearchRun } = require('../middleware/validators');
const authApiKey = require('../middleware/authApiKey');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure Multer
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// Routes
router.post('/run', authApiKey, upload.single('file'), validateAmazonSearchRun, amazonSearchController.runAmazonSearch);
router.post('/validate-excel', upload.single('file'), validationController.validateExcel);
router.get('/offers', amazonSearchController.getOffers);

module.exports = router;
