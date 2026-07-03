import server from './server.js';
import config from './config.js';

const app = server();
const PORT = config.port;

const httpServer = app.listen(PORT, () => {
  console.log(`🚀 MCP Gateway running on http://localhost:${PORT}`);
  console.log(`📊 Health check: GET http://localhost:${PORT}/health`);
  console.log(`🔄 SSE endpoint: GET http://localhost:${PORT}/openrouter/sse`);
  console.log(`💬 Messages endpoint: POST http://localhost:${PORT}/openrouter/messages`);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  SIGTERM received, shutting down gracefully...');
  httpServer.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n⏹️  SIGINT received, shutting down gracefully...');
  httpServer.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
