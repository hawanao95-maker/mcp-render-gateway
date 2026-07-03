import config from '../config.js';

export default function authMiddleware(req, res, next) {
  // Skip auth if no API key is configured
  if (!config.gateway.apiKey) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    return res.status(401).json({
      error: 'Missing Authorization header',
      message: 'Please provide Authorization: Bearer <api-key>',
    });
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer') {
    return res.status(401).json({
      error: 'Invalid Authorization scheme',
      message: 'Use: Authorization: Bearer <api-key>',
    });
  }

  if (token !== config.gateway.apiKey) {
    return res.status(403).json({
      error: 'Invalid API key',
    });
  }

  next();
}
