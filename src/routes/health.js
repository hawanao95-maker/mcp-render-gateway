import express from 'express';
import config from '../config.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    environment: config.nodeEnv,
  });
});

export default router;
