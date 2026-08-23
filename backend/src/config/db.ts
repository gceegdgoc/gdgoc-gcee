import mongoose from 'mongoose';
import { env } from './env';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };
global.mongooseCache = cached;

export function getMongoUri(): string {
  return (process.env.MONGODB_URI || env.mongodbUri || '').trim();
}

export function isConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

/**
 * True when the error is caused by the database connection itself
 * (missing URI, unreachable cluster, bad DNS, auth at the driver level).
 * Used to return 503 "database unavailable" only for real DB failures,
 * instead of masking validation/duplicate/server errors behind it.
 */
export function isDbConnectionError(err: unknown): boolean {
  if (!err) return false;
  const name = (err as { name?: string }).name || '';
  const message = (err as { message?: string }).message || '';
  if (name === 'MongooseServerSelectionError' || name === 'MongoServerSelectionError') return true;
  if (
    message.includes('MONGODB_URI is not configured') ||
    message.includes('querySrv') ||
    message.includes('ENOTFOUND') ||
    message.includes('ECONNREFUSED') ||
    message.includes('ETIMEDOUT') ||
    message.includes('Connection timeout') ||
    message.includes('bad auth') ||
    message.includes('Authentication failed')
  ) {
    return true;
  }
  // Mongoose queries buffered while disconnected fail with "buffering timed out"
  return message.includes('buffering timed out');
}

export async function connectDB(): Promise<typeof mongoose> {
  const uri = getMongoUri();

  if (!uri || (uri.startsWith('mongodb://127.0.0.1') && env.isProd)) {
    const msg = '[DB] MONGODB_URI is not configured in production environment variables (e.g. Vercel dashboard).';
    console.error(msg);
    throw new Error(msg);
  }

  // If already connected, reuse connection
  if (mongoose.connection.readyState === 1) {
    console.log('[DB] Reusing existing connection');
    cached.conn = mongoose;
    return mongoose;
  }

  // If connection is in progress, wait for it
  if (cached.promise && mongoose.connection.readyState === 2) {
    cached.conn = await cached.promise;
    return cached.conn;
  }

  // Reset in case of prior disconnection or error
  cached.promise = null;
  cached.conn = null;

  console.log('[DB] Connecting...');

  const opts: mongoose.ConnectOptions = {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    minPoolSize: 1,
    bufferCommands: false,
  };

  cached.promise = mongoose
    .connect(uri, opts)
    .then((m) => {
      console.log('[DB] Connected successfully');
      cached.conn = m;
      return m;
    })
    .catch((err) => {
      console.error('[DB] Connection failed:', err.message);
      cached.promise = null;
      cached.conn = null;
      throw err;
    });

  cached.conn = await cached.promise;
  return cached.conn;
}
