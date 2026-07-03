import { log } from './logging.js';

export default function errorMiddleware(err, req, res, next) {
  log('error', 'Request error', {
    message: err.message,
    path: req.path,
    method: req.method,
  });

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: message,
    timestamp: new Date().toISOString(),
  });
}
