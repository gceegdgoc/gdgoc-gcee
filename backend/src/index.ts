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

// Graceful shutdown for local dev.
process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});

export default app;
