const config = require('../config');

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Header Authorization diperlukan',
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Format token harus: Bearer <SECRET_KEY>',
    });
  }

  const token = parts[1];
  if (token !== config.secretKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Token otentikasi tidak valid',
    });
  }

  next();
}

module.exports = authMiddleware;
