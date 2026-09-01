import { createApp } from './app';
import { connectDB, isConnected } from './config/db';
import { env } from './config/env';

const app = createApp();

// Local / standalone runtime.
const server = app.listen(env.port, async () => {
  console.log(`[gdgoc-gcee] API listening on http://localhost:${env.port}`);
  if (!isConnected()) {
    try {
      await connectDB();
      console.log('[gdgoc-gcee] MongoDB connected');
    } catch (err) {
      console.error('[gdgoc-gcee] MongoDB connection failed:', (err as Error).message);
    }
  }
});

server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[gdgoc-gcee] Port ${env.port} is already in use by another process.`);
    console.error(`[gdgoc-gcee] To free port ${env.port}, run: fuser -k ${env.port}/tcp`);
    process.exit(1);
  } else {
    console.error('[gdgoc-gcee] Server error:', err);
  }
});

// Graceful shutdown for local dev.
process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});

export default app;
