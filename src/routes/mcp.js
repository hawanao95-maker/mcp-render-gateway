import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import OpenRouter from '../openrouter.js';
import { log } from '../middleware/logging.js';

const router = express.Router();
const openrouter = new OpenRouter();

// Store active SSE connections
const sseConnections = new Map();

// SSE endpoint for streaming responses
router.get('/sse', (req, res) => {
  const sessionId = uuidv4();
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', sessionId })}

`);

  sseConnections.set(sessionId, res);
  log('info', 'SSE client connected', { sessionId });

  // Keep connection alive with heartbeat
  const heartbeat = setInterval(() => {
    if (res.writable) {
      res.write(`:heartbeat\n\n`);
    } else {
      clearInterval(heartbeat);
      sseConnections.delete(sessionId);
    }
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseConnections.delete(sessionId);
    log('info', 'SSE client disconnected', { sessionId });
  });
});

// Messages endpoint for MCP protocol
router.post('/messages', async (req, res) => {
  try {
    const { messages, model, sessionId, stream = false } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'messages array is required',
      });
    }

    log('info', 'Processing message request', {
      sessionId: sessionId || 'none',
      messageCount: messages.length,
      stream,
      model: model || 'default',
    });

    // If streaming, send through SSE
    if (stream && sessionId && sseConnections.has(sessionId)) {
      const sseRes = sseConnections.get(sessionId);
      const response = await openrouter.createCompletion(messages, model, true);

      // Stream response through SSE
      for await (const chunk of response) {
        if (sseRes.writable) {
          sseRes.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}

`);
        }
      }

      return res.json({
        status: 'streaming',
        sessionId,
      });
    }

    // Standard response
    const response = await openrouter.createCompletion(messages, model, false);
    
    res.json({
      id: uuidv4(),
      object: 'text_completion',
      created: Math.floor(Date.now() / 1000),
      model: model || 'openrouter/auto',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: response,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    });
  } catch (error) {
    log('error', 'Message processing error', { error: error.message });
    res.status(500).json({
      error: 'Message processing failed',
      message: error.message,
    });
  }
});

// List available models
router.get('/models', async (req, res) => {
  try {
    const models = await openrouter.listModels();
    res.json({
      object: 'list',
      data: models,
    });
  } catch (error) {
    log('error', 'Models listing error', { error: error.message });
    res.status(500).json({
      error: 'Failed to fetch models',
      message: error.message,
    });
  }
});

// Health check for this service
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    openrouter: 'connected',
    activeSessions: sseConnections.size,
  });
});

export default router;
