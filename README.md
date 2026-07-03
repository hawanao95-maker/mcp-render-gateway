# MCP Render Gateway

**Production-ready Model Context Protocol (MCP) gateway for OpenRouter and AI model providers**

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![Express](https://img.shields.io/badge/Express-4.18+-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

## What is this?

A lightweight, cloud-native gateway that exposes OpenRouter's AI models through the Model Context Protocol (MCP). It's designed to work seamlessly with Bolt, Hooke, and other MCP-compatible applications.

### Key Features

✅ **Streaming SSE Support** - Real-time responses via Server-Sent Events  
✅ **MCP Compatible** - Works with Bolt and other MCP clients  
✅ **OpenRouter Integration** - Access 200+ models instantly  
✅ **Production Ready** - Auth, logging, rate limiting, graceful shutdown  
✅ **Zero Configuration** - Environment variables only, no config files  
✅ **Cloud Native** - Deploy on Render, Railway, Heroku in seconds  
✅ **Multiple SSE Clients** - Handle concurrent streaming connections  
✅ **Health Checks** - Built-in monitoring endpoints  

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/hawanao95-maker/mcp-render-gateway.git
cd mcp-render-gateway
npm install
```

### 2. Configure

```bash
cp .env.example .env
```

Edit `.env`:
```env
OPENROUTER_API_KEY=your_api_key_here
PORT=3000
GATEWAY_API_KEY=your_secret_key_here
DEFAULT_MODEL=openrouter/auto
LOG_LEVEL=info
```

### 3. Run Locally

```bash
# Production
npm start

# Development (auto-reload)
npm run dev
```

Server runs on `http://localhost:3000`

## API Endpoints

### Health Check

```bash
GET /health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.5,
  "version": "1.0.0",
  "environment": "production"
}
```

### SSE Connection

```bash
GET /openrouter/sse
```

Establishes a Server-Sent Events connection for streaming responses.

**Response (stream):**
```
data: {"type":"connected","sessionId":"uuid"}

data: {"type":"chunk","content":"Hello"}

data: {"type":"chunk","content":" world"}

```

### Chat Completion

```bash
POST /openrouter/messages
Authorization: Bearer your_gateway_api_key
Content-Type: application/json
```

**Request:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "What is the capital of France?"
    }
  ],
  "model": "openrouter/auto",
  "stream": false
}
```

**Response:**
```json
{
  "id": "uuid",
  "object": "text_completion",
  "created": 1234567890,
  "model": "openrouter/auto",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "The capital of France is Paris."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 0,
    "completion_tokens": 0,
    "total_tokens": 0
  }
}
```

### List Models

```bash
GET /openrouter/models
Authorization: Bearer your_gateway_api_key
```

**Response:**
```json
{
  "object": "list",
  "data": [
    {
      "id": "openai/gpt-4",
      "name": "GPT-4",
      "description": "Most capable model",
      "context_length": 8192,
      "pricing": {
        "prompt": "0.03",
        "completion": "0.06"
      }
    }
  ]
}
```

## Streaming Example

### Using cURL

```bash
# Connect to SSE stream
curl -N http://localhost:3000/openrouter/sse

# In another terminal, send a message
curl -X POST http://localhost:3000/openrouter/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_gateway_api_key" \
  -d '{
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": true,
    "sessionId": "your-session-id"
  }'
```

### Using JavaScript

```javascript
// Connect to SSE stream
const eventSource = new EventSource('http://localhost:3000/openrouter/sse');
let sessionId;

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'connected') {
    sessionId = data.sessionId;
    console.log('Connected with session:', sessionId);
  } else if (data.type === 'chunk') {
    console.log('Chunk:', data.content);
  }
};

// Send a message
async function sendMessage(content) {
  const response = await fetch('http://localhost:3000/openrouter/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer your_gateway_api_key'
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content }],
      sessionId,
      stream: true
    })
  });
  return response.json();
}

// Usage
await sendMessage('What is machine learning?');
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENROUTER_API_KEY` | Yes | - | Your OpenRouter API key |
| `OPENROUTER_BASE_URL` | No | https://openrouter.io/api/v1 | OpenRouter API endpoint |
| `PORT` | No | 3000 | Server port |
| `GATEWAY_API_KEY` | No | - | Optional gateway authentication key |
| `DEFAULT_MODEL` | No | openrouter/auto | Default model if none specified |
| `LOG_LEVEL` | No | info | Logging level (error, warn, info, debug) |
| `NODE_ENV` | No | production | Environment (production, development) |

## Deploy on Render

### 1. Create a new Web Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. Select this repository

### 2. Configure

- **Name:** `mcp-render-gateway`
- **Environment:** `Node`
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Plan:** Free or Paid (your choice)

### 3. Add Environment Variables

Click **Environment** and add:

```
OPENROUTER_API_KEY=your_key_here
GATEWAY_API_KEY=your_secret_here
DEFAULT_MODEL=openrouter/auto
LOG_LEVEL=info
```

### 4. Deploy

Click **Create Web Service**. Render will deploy automatically.

Your gateway will be available at:
```
https://mcp-render-gateway.onrender.com
```

## Architecture

```
┌──────────────────────────────────────────┐
│         MCP Client (Bolt, Hooke)         │
└──────────────────┬───────────────────────┘
                   │
                   ↓
    ┌──────────────────────────────┐
    │    MCP Render Gateway        │
    ├──────────────────────────────┤
    │  • Express.js Server         │
    │  • SSE Streaming             │
    │  • Request Logging           │
    │  • Authentication            │
    │  • Error Handling            ���
    └──────────────────────────────┘
                   │
                   ↓
    ┌──────────────────────────────┐
    │    OpenRouter API            │
    ├──────────────────────────────┤
    │  • GPT-4, GPT-3.5            │
    │  • Claude 3                  │
    │  • Gemini Pro                │
    │  • 200+ Models               │
    └──────────────────────────────┘
```

## Project Structure

```
mcp-render-gateway/
├── src/
│   ├── index.js                 # Server entry point
│   ├── server.js                # Express app setup
│   ├── config.js                # Configuration management
│   ├── openrouter.js            # OpenRouter API client
│   ├── middleware/
│   │   ├── auth.js              # Authentication middleware
│   │   ├── logging.js           # Request logging
│   │   └── errors.js            # Error handling
│   ├── tools/
│   │   ├── chat.js              # Chat completion tool
│   │   ├── models.js            # Models listing tool
│   │   ├── embeddings.js        # Embeddings tool
│   │   └── image.js             # Image generation tool
│   └── routes/
│       ├── health.js            # Health check endpoint
│       └── mcp.js               # MCP protocol routes
├── package.json
├── .env.example
├── render.yaml
└── README.md
```

## Advanced Configuration

### Custom Model

To use a specific model instead of auto-detection:

```bash
DEFAULT_MODEL=openai/gpt-4
```

### Disable Authentication

Leave `GATEWAY_API_KEY` unset to disable API key authentication.

### Enable Debug Logging

```bash
LOG_LEVEL=debug
```

## Troubleshooting

### "Invalid API Key" Error

```
❌ Invalid API key
```

**Solution:** Verify your `OPENROUTER_API_KEY` is correct in `.env`

### "Missing Authorization Header" Error

```
❌ Missing Authorization header
```

**Solution:** Include the header:
```bash
-H "Authorization: Bearer your_gateway_api_key"
```

### SSE Connection Timeout

**Solution:** The server sends heartbeats every 30 seconds. If you're still timing out:
1. Check firewall/proxy settings
2. Increase client timeout
3. Verify `OPENROUTER_API_KEY` is valid

### No Response from OpenRouter

**Solution:**
1. Check API key is valid at [openrouter.io](https://openrouter.io)
2. Verify network connectivity
3. Check logs: `LOG_LEVEL=debug`
4. Test with `curl -H "Authorization: Bearer $OPENROUTER_API_KEY" https://openrouter.io/api/v1/models`

## Performance Tips

1. **Use streaming** for long responses
2. **Connection pooling** is automatic via axios
3. **Request timeouts** are 2 minutes by default
4. **SSE heartbeats** keep connections alive
5. **Multiple clients** are supported simultaneously

## Security

- Never commit `.env` files
- Use strong `GATEWAY_API_KEY` (minimum 32 characters)
- Enable authentication in production
- Monitor API usage and costs
- Rotate API keys regularly

## Future Enhancements

- [ ] Multi-provider adapter pattern (Anthropic, OpenAI, Ollama)
- [ ] Request rate limiting
- [ ] Response caching
- [ ] Webhook support
- [ ] Database session persistence
- [ ] Usage analytics dashboard
- [ ] Cost tracking per API key
- [ ] Prompt templates

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push to branch
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Support

For issues:
1. Check [Troubleshooting](#troubleshooting) section
2. Review [GitHub Issues](https://github.com/hawanao95-maker/mcp-render-gateway/issues)
3. Check OpenRouter [documentation](https://openrouter.io/docs)

## Acknowledgments

- Built with [Express.js](https://expressjs.com)
- Powered by [OpenRouter](https://openrouter.io)
- Compatible with [Model Context Protocol](https://modelcontextprotocol.io)
