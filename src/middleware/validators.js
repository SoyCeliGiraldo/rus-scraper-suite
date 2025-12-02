const Joi = require('joi');

const amazonInvoicesSchema = Joi.object({
  maxPages: Joi.number().integer().min(1).max(100).default(20),
  onlyNew: Joi.boolean().default(false),
  amex: Joi.boolean().default(false),
  cardBrand: Joi.string().valid('AMEX','VISA','MASTERCARD','DISCOVER').optional(),
  cardLast4: Joi.string().pattern(/^\d{4}$/).optional(),
  headless: Joi.boolean().default(true),
});

function validateAmazonInvoices(req, res, next) {
  const { error, value } = amazonInvoicesSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) return res.status(400).json({ error: error.message });
  req.body = value;
  next();
}

const amazonSearchRunSchema = Joi.object({
  sheetName: Joi.string().optional(),
  columnName: Joi.string().optional(),
  maxParts: Joi.number().integer().min(0).max(1000).default(0),
  offersLimit: Joi.number().integer().min(1).max(50).default(15),
  delayMs: Joi.number().integer().min(0).max(20000).default(1500),
  headless: Joi.boolean().default(true),
  autoLogin: Joi.boolean().default(false),
});

function validateAmazonSearchRun(req, res, next) {
  const { error, value } = amazonSearchRunSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) return res.status(400).json({ error: error.message });
  req.body = value;
  next();
}

module.exports = { validateAmazonInvoices, validateAmazonSearchRun };
