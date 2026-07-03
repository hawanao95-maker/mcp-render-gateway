/**
 * Models Tool
 * Manages available models from OpenRouter
 */

import OpenRouter from '../openrouter.js';
import { log } from '../middleware/logging.js';

const openrouter = new OpenRouter();

export async function listModels(req, res) {
  try {
    log('info', 'Listing available models');
    
    const models = await openrouter.listModels();

    return res.json({
      object: 'list',
      count: models.length,
      data: models,
    });
  } catch (error) {
    log('error', 'Models listing error', { error: error.message });
    return res.status(500).json({
      error: 'Failed to list models',
      message: error.message,
    });
  }
}

export async function getModel(req, res) {
  try {
    const { modelId } = req.params;

    if (!modelId) {
      return res.status(400).json({
        error: 'Model ID required',
      });
    }

    log('info', 'Fetching model details', { modelId });

    const models = await openrouter.listModels();
    const model = models.find(m => m.id === modelId);

    if (!model) {
      return res.status(404).json({
        error: 'Model not found',
        modelId,
      });
    }

    return res.json(model);
  } catch (error) {
    log('error', 'Model fetch error', { error: error.message });
    return res.status(500).json({
      error: 'Failed to fetch model',
      message: error.message,
    });
  }
}

export default { listModels, getModel };
