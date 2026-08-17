import mongoose from 'mongoose';
import dns from 'dns';
import { config } from '../config/index.js';
import { logger } from '../logger/index.js';

// Prefer IPv4 resolution for Windows DNS SRV lookup compatibility
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {
  // Ignore if unsupported in node version
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
    } catch {
      logger.error(`MongoDB database connection error: ${primaryError.message}`);
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
