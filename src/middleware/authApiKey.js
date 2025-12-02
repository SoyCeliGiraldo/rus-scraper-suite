module.exports = function authApiKey(req, res, next) {
  const required = process.env.API_KEY || 'change_me_secure';
  const headerKey = req.headers['x-api-key'] || req.headers['authorization']?.replace(/^Bearer\s+/i, '');
  if (!headerKey || headerKey !== required) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};
