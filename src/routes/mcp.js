import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import OpenRouter from '../openrouter.js';
import { log } from '../middleware/logging.js';

const router = express.Router();
const openrouter = new OpenRouter();

// Store active SSE connections
const sseConnections = new Map();

/**
 * Shared SSE handler for establishing Server-Sent Events connection
 * Works with both GET and POST requests on any path
 * Includes Render Nginx buffering bypass for persistent streams
 */
function handleSse(req, res) {
  const sessionId = uuidv4();
  
  // Use writeHead to set headers BEFORE any data is sent
  // This ensures Render's Nginx proxy doesn't buffer the response
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Critical: Disables Nginx buffering on Render
    'Access-Control-Allow-Origin': '*',
  });

  // Flush headers immediately to wake up the stream
  res.flushHeaders();

  // Send initial ping to establish the stream connection
  res.write(': ping\n\n');

  // Send connection message with sessionId
  res.write(`data: ${JSON.stringify({ type: 'connected', sessionId })}\n\n`);

  sseConnections.set(sessionId, res);
  log('info', 'SSE client connected', { sessionId, path: req.path, method: req.method });

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

  // Handle errors
  req.on('error', (error) => {
    log('error', 'SSE request error', { sessionId, error: error.message });
    clearInterval(heartbeat);
    sseConnections.delete(sessionId);
  });

  res.on('error', (error) => {
    log('error', 'SSE response error', { sessionId, error: error.message });
    clearInterval(heartbeat);
    sseConnections.delete(sessionId);
  });
}

// Root path - handles both GET and POST for direct Bolt connections
router.route('/').get(handleSse).post(handleSse);

// SSE endpoint - handles both GET and POST
router.route('/sse').get(handleSse).post(handleSse);

// SSE endpoint with /openrouter prefix - handles both GET and POST
router.route('/openrouter/sse').get(handleSse).post(handleSse);

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
          sseRes.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
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

// Messages endpoint with /openrouter prefix
router.post('/openrouter/messages', async (req, res) => {
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
          sseRes.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
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

// List available models with /openrouter prefix
router.get('/openrouter/models', async (req, res) => {
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

// Health check with /openrouter prefix
router.get('/openrouter/health', (req, res) => {
  res.json({
    status: 'healthy',
    openrouter: 'connected',
    activeSessions: sseConnections.size,
  });
});

export default router;
