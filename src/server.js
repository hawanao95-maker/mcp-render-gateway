import express from 'express';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import authMiddleware from './middleware/auth.js';
import loggingMiddleware from './middleware/logging.js';
import errorMiddleware from './middleware/errors.js';

import healthRoutes from './routes/health.js';
import mcpRoutes from './routes/mcp.js';

export default function createServer() {
  const app = express();

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Logging
  app.use(loggingMiddleware);

  // Health check (no auth required)
  app.use('/health', healthRoutes);

  // API routes (with optional auth)
  app.use('/openrouter', authMiddleware, mcpRoutes);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: 'Not Found',
      path: req.path,
      method: req.method,
    });
  });

  // Error handling
  app.use(errorMiddleware);

  return app;
}
