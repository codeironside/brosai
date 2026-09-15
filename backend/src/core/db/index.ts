import mongoose from 'mongoose';
import dns from 'dns';
import { config } from '../config/index.js';
import { logger } from '../logger/index.js';

// Prefer IPv4; Atlas mongodb+srv needs working SRV DNS. Local filters (e.g. 127.0.2.2)
// often refuse those lookups, so fall back to public resolvers for Node only.
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {
  // Ignore if unsupported in this Node version
}

const PUBLIC_DNS = ['8.8.8.8', '1.1.1.1', '8.8.4.4'];

function ensureWorkingDns() {
  try {
    const current = dns.getServers();
    const onlyLoopback =
      current.length > 0 &&
      current.every((server) => /^(127\.|::1|0\.0\.0\.0)/.test(String(server).split('%')[0]));
    if (onlyLoopback || current.length === 0) {
      dns.setServers(PUBLIC_DNS);
      logger.warn(`DNS servers were local-only (${current.join(', ') || 'none'}). Using ${PUBLIC_DNS.join(', ')} for MongoDB SRV.`);
    }
  } catch (err: any) {
    logger.warn(`Could not adjust DNS servers: ${err?.message || err}`);
  }
}

export const isDatabaseConnected = (): boolean => mongoose.connection.readyState === 1;

export const databaseStatus = (): 'connected' | 'connecting' | 'disconnecting' | 'disconnected' => {
  switch (mongoose.connection.readyState) {
    case 1:
      return 'connected';
    case 2:
      return 'connecting';
    case 3:
      return 'disconnecting';
    default:
      return 'disconnected';
  }
};

export const connectDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState === 1) return;
  if (mongoose.connection.readyState === 2) {
    await mongoose.connection.asPromise();
    return;
  }

  ensureWorkingDns();

  const primaryUri = config.db.uri;
  const localFallbackUri = `mongodb://127.0.0.1:27017/${config.db.name}`;
  const isProd = config.app.env === 'production';
  const timeoutMs = isProd ? 15000 : 10000;

  try {
    logger.info(`Connecting to primary MongoDB cluster...`);

    await mongoose.connect(primaryUri, {
      serverSelectionTimeoutMS: timeoutMs,
    });

    logger.info(`Successfully connected to MongoDB database [${config.db.name}] in [${config.app.env}] mode.`);
  } catch (primaryError: any) {
    if (isProd) {
      logger.error(`MongoDB database connection error: ${primaryError.message}`);
      throw primaryError;
    }

    logger.warn(`Primary MongoDB connection notice (${primaryError.message}). Attempting local database fallback...`);

    try {
      await mongoose.connect(localFallbackUri, {
        serverSelectionTimeoutMS: 3000,
      });
      logger.info(`Successfully connected to local MongoDB fallback at [${localFallbackUri}]`);
    } catch (localError: any) {
      logger.error(`MongoDB database connection error: ${primaryError.message}`);
      logger.error(
        `Local fallback also failed (${localError?.message || localError}). ` +
          `Atlas needs working DNS for mongodb+srv; local needs mongod on 127.0.0.1:27017 (or Docker Desktop + mongo).`,
      );
      throw primaryError;
    }
  }
};

export const ensureDatabase = async (): Promise<void> => {
  const state = mongoose.connection.readyState;
  if (state === 1) return;
  if (state === 2) {
    await mongoose.connection.asPromise();
    return;
  }
  if (state === 3) {
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 3000);
      mongoose.connection.once('close', () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }
  await connectDatabase();
};

export const disconnectDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState === 0) return;
  await mongoose.disconnect();
};
