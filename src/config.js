import dotenv from 'dotenv';

dotenv.config();

const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  
  // OpenRouter Configuration
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY || '',
    baseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.io/api/v1',
    defaultModel: process.env.DEFAULT_MODEL || 'openrouter/auto',
  },
  
  // Gateway Configuration
  gateway: {
    apiKey: process.env.GATEWAY_API_KEY || '',
  },
};

// Validate required configuration
if (!config.openrouter.apiKey) {
  console.warn('⚠️  OPENROUTER_API_KEY not set in environment');
}

if (!config.gateway.apiKey) {
  console.warn('⚠️  GATEWAY_API_KEY not set in environment (authentication disabled)');
}

export default config;
