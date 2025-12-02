const express = require('express');
const router = express.Router();
const scraperController = require('../controllers/scraperController');
const validationController = require('../controllers/validationController');
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
router.post('/run', upload.single('file'), scraperController.runScraper);
router.post('/validate-excel', upload.single('file'), validationController.validateExcel);
router.get('/offers', scraperController.getOffers);

module.exports = router;
