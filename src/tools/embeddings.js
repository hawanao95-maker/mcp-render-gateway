/**
 * Embeddings Tool
 * Generates vector embeddings for text
 */

import OpenRouter from '../openrouter.js';
import { log } from '../middleware/logging.js';

const openrouter = new OpenRouter();

export async function createEmbedding(req, res) {
  try {
    const { input, model = 'openrouter/auto' } = req.body;

    if (!input) {
      return res.status(400).json({
        error: 'Input required',
        message: 'input (string or array) is required',
      });
    }

    log('info', 'Creating embeddings', {
      model,
      inputType: Array.isArray(input) ? 'array' : 'string',
      inputLength: Array.isArray(input) ? input.length : input.length,
    });

    const embeddings = await openrouter.createEmbedding(input, model);

    return res.json({
      object: 'list',
      data: embeddings,
      model,
    });
  } catch (error) {
    log('error', 'Embedding creation error', { error: error.message });
    return res.status(500).json({
      error: 'Embedding creation failed',
      message: error.message,
    });
  }
}

export default { createEmbedding };
