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
 * Implements Model Context Protocol (MCP) SSE specification
 * Works with both GET and POST requests on any path
 */
function handleSse(req, res) {
  const sessionId = uuidv4();
  
  // Step 1: Set response headers for SSE streaming
  // Use writeHead to set ALL headers at once before any data
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disables Nginx buffering on Render
    'Access-Control-Allow-Origin': '*',
  });

  // Flush headers immediately to wake up the stream through proxies
  res.flushHeaders();

  // Step 2: Send MCP protocol initialization sequence
  // First, a comment ping to establish the stream
  res.write(': ping\n\n');

  // Step 3: Send the MANDATORY Model Context Protocol endpoint event
  // This tells Bolt where to POST tool execution requests
  const endpointPath = '/openrouter/messages';
  res.write(`event: endpoint\ndata: ${encodeURIComponent(endpointPath)}\n\n`);

  // Step 4: Send connection acknowledgment with session metadata
  res.write(`event: connection\ndata: ${JSON.stringify({ sessionId, version: '1.0' })}\n\n`);

  sseConnections.set(sessionId, res);
  log('info', 'SSE client connected', { 
    sessionId, 
    path: req.path, 
    method: req.method,
    endpoint: endpointPath 
  });

  // Keep connection alive with periodic heartbeat
  const heartbeat = setInterval(() => {
    if (res.writable) {
      res.write(`: heartbeat\n\n`);
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

  // Handle stream errors gracefully
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

// Root path - MCP entry point for direct connections (GET and POST)
router.route('/').get(handleSse).post(handleSse);

// /sse path - alternative MCP entry point (GET and POST)
router.route('/sse').get(handleSse).post(handleSse);

// /openrouter/sse path - prefixed MCP entry point (GET and POST)
router.route('/openrouter/sse').get(handleSse).post(handleSse);

// POST /messages - MCP tool execution endpoint
// Receives tool requests via HTTP POST after SSE handshake
router.post('/messages', async (req, res) => {
  try {
    const { messages, model, sessionId, stream = false } = req.body;

    // Handle empty/initialization requests from Bolt protocol handshake
    if (!messages) {
      log('info', 'Initialization request received', { sessionId });
      return res.status(200).json({ success: true, ready: true });
    }

    if (!Array.isArray(messages)) {
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
          sseRes.write(`event: message\ndata: ${JSON.stringify({ content: chunk })}\n\n`);
        }
      }

      return res.json({
        status: 'streaming',
        sessionId,
      });
    }

    // Standard response
    const response = await openrouter.createCompletion(messages, model, false);
    
    return res.status(200).json({
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
    return res.status(500).json({
      error: 'Message processing failed',
      message: error.message,
    });
  }
});

// POST /openrouter/messages - Prefixed MCP tool execution endpoint
router.post('/openrouter/messages', async (req, res) => {
  try {
    const { messages, model, sessionId, stream = false } = req.body;

    // Handle empty/initialization requests from Bolt protocol handshake
    if (!messages) {
      log('info', 'Initialization request received', { sessionId });
      return res.status(200).json({ success: true, ready: true });
    }

    if (!Array.isArray(messages)) {
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
          sseRes.write(`event: message\ndata: ${JSON.stringify({ content: chunk })}\n\n`);
        }
      }

      return res.json({
        status: 'streaming',
        sessionId,
      });
    }

    // Standard response
    const response = await openrouter.createCompletion(messages, model, false);
    
    return res.status(200).json({
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
    return res.status(500).json({
      error: 'Message processing failed',
      message: error.message,
    });
  }
});

// GET /models - List available models
router.get('/models', async (req, res) => {
  try {
    const models = await openrouter.listModels();
    return res.status(200).json({
      object: 'list',
      data: models,
    });
  } catch (error) {
    log('error', 'Models listing error', { error: error.message });
    return res.status(500).json({
      error: 'Failed to fetch models',
      message: error.message,
    });
  }
});

// GET /openrouter/models - List available models (prefixed)
router.get('/openrouter/models', async (req, res) => {
  try {
    const models = await openrouter.listModels();
    return res.status(200).json({
      object: 'list',
      data: models,
    });
  } catch (error) {
    log('error', 'Models listing error', { error: error.message });
    return res.status(500).json({
      error: 'Failed to fetch models',
      message: error.message,
    });
  }
});

// GET /health - Service health check
router.get('/health', (req, res) => {
  return res.status(200).json({
    status: 'healthy',
    openrouter: 'connected',
    activeSessions: sseConnections.size,
  });
});

// GET /openrouter/health - Service health check (prefixed)
router.get('/openrouter/health', (req, res) => {
  return res.status(200).json({
    status: 'healthy',
    openrouter: 'connected',
    activeSessions: sseConnections.size,
  });
});

export default router;
