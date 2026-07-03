import axios from 'axios';
import config from './config.js';
import { log } from './middleware/logging.js';

class OpenRouter {
  constructor() {
    this.apiKey = config.openrouter.apiKey;
    this.baseUrl = config.openrouter.baseUrl;
    this.defaultModel = config.openrouter.defaultModel;
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://github.com/hawanao95-maker/mcp-render-gateway',
        'X-Title': 'MCP Render Gateway',
        'Content-Type': 'application/json',
      },
      timeout: 120000, // 2 minutes
    });
  }

  /**
   * Create a chat completion
   * @param {Array} messages - Message array
   * @param {String} model - Model to use (optional, defaults to configured model)
   * @param {Boolean} stream - Whether to stream the response
   * @returns {Promise<String|AsyncIterator>} - Response text or async iterator for streaming
   */
  async createCompletion(messages, model = null, stream = false) {
    try {
      const selectedModel = model || this.defaultModel;

      log('info', 'OpenRouter API call', {
        model: selectedModel,
        messageCount: messages.length,
        stream,
      });

      const response = await this.client.post('/chat/completions', {
        model: selectedModel,
        messages,
        stream,
        temperature: 0.7,
        max_tokens: 2048,
      });

      if (stream) {
        // Return async iterator for streaming
        return this._streamIterator(response.data);
      }

      // Return text content from first choice
      const content = response.data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('No content in response');
      }

      log('info', 'OpenRouter response received', {
        model: selectedModel,
        tokensUsed: response.data?.usage?.total_tokens || 0,
      });

      return content;
    } catch (error) {
      log('error', 'OpenRouter API error', {
        message: error.message,
        status: error.response?.status,
      });
      throw error;
    }
  }

  /**
   * List available models from OpenRouter
   * @returns {Promise<Array>} - Array of available models
   */
  async listModels() {
    try {
      log('info', 'Fetching available models from OpenRouter');

      const response = await this.client.get('/models');
      const models = response.data?.data || [];

      log('info', 'Models fetched successfully', {
        count: models.length,
      });

      return models.map(model => ({
        id: model.id,
        name: model.name,
        description: model.description,
        context_length: model.context_length,
        pricing: model.pricing,
      }));
    } catch (error) {
      log('error', 'Failed to fetch models', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate embeddings
   * @param {String|Array} input - Text or array of texts to embed
   * @param {String} model - Embedding model to use
   * @returns {Promise<Array>} - Array of embeddings
   */
  async createEmbedding(input, model = 'openrouter/auto') {
    try {
      log('info', 'Creating embeddings', { model });

      const response = await this.client.post('/embeddings', {
        model,
        input,
      });

      log('info', 'Embeddings created', {
        count: response.data?.data?.length || 0,
      });

      return response.data?.data || [];
    } catch (error) {
      log('error', 'Embedding creation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Moderate content (if supported)
   * @param {String} input - Content to moderate
   * @returns {Promise<Object>} - Moderation result
   */
  async moderate(input) {
    try {
      log('info', 'Running moderation check');

      const response = await this.client.post('/moderations', {
        input,
      });

      return response.data?.results?.[0] || {};
    } catch (error) {
      log('error', 'Moderation check failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Internal: Create async iterator for streaming
   * @private
   */
  async *_streamIterator(stream) {
    // This is a placeholder for actual streaming implementation
    // In a real streaming scenario, you would parse SSE events
    yield '';
  }
}

export default OpenRouter;
