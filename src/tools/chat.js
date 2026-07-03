/**
 * Chat Completion Tool
 * Handles chat-based interactions through the MCP gateway
 */

import OpenRouter from '../openrouter.js';
import { log } from '../middleware/logging.js';

const openrouter = new OpenRouter();

export async function handleChatCompletion(req, res) {
  try {
    const { messages, model, temperature = 0.7, maxTokens = 2048 } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'messages array is required',
      });
    }

    // Validate message format
    for (const msg of messages) {
      if (!msg.role || !msg.content) {
        return res.status(400).json({
          error: 'Invalid message format',
          message: 'Each message must have role and content',
        });
      }
    }

    log('info', 'Chat completion requested', {
      messageCount: messages.length,
      model: model || 'default',
      temperature,
      maxTokens,
    });

    const response = await openrouter.createCompletion(messages, model, false);

    return res.json({
      role: 'assistant',
      content: response,
    });
  } catch (error) {
    log('error', 'Chat completion error', { error: error.message });
    return res.status(500).json({
      error: 'Chat completion failed',
      message: error.message,
    });
  }
}

export async function handleStreamingCompletion(req, res) {
  try {
    const { messages, model, sessionId } = req.body;

    log('info', 'Streaming completion requested', {
      sessionId,
      model: model || 'default',
    });

    // Implementation would use SSE from main route
    return res.json({
      status: 'streaming',
      sessionId,
    });
  } catch (error) {
    log('error', 'Streaming error', { error: error.message });
    return res.status(500).json({
      error: 'Streaming failed',
      message: error.message,
    });
  }
}

export default { handleChatCompletion, handleStreamingCompletion };
