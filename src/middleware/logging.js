import config from '../config.js';

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLogLevel = LOG_LEVELS[config.logLevel] || LOG_LEVELS.info;

function log(level, message, data = {}) {
  if (LOG_LEVELS[level] <= currentLogLevel) {
    const timestamp = new Date().toISOString();
    const dataStr = Object.keys(data).length > 0 ? ` ${JSON.stringify(data)}` : '';
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}${dataStr}`);
  }
}

export function logRequest(req, res, next) {
  const start = Date.now();
  const originalSend = res.send;

  res.send = function (data) {
    const duration = Date.now() - start;
    log('info', `${req.method} ${req.path}`, {
      status: res.statusCode,
      duration: `${duration}ms`,
    });
    return originalSend.call(this, data);
  };

  next();
}

export { log };

export default function loggingMiddleware(req, res, next) {
  logRequest(req, res, next);
}
