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

export const connectDatabase = async (): Promise<void> => {
  const primaryUri = config.db.uri;
  const localFallbackUri = `mongodb://127.0.0.1:27017/${config.db.name}`;

  try {
    logger.info(`Connecting to primary MongoDB cluster...`);
    
    await mongoose.connect(primaryUri, {
      serverSelectionTimeoutMS: 4000,
    });

    logger.info(`Successfully connected to MongoDB database [${config.db.name}] in [${config.app.env}] mode.`);
  } catch (primaryError: any) {
    logger.warn(`Primary MongoDB connection notice (${primaryError.message}). Attempting local database fallback...`);

    try {
      await mongoose.connect(localFallbackUri, {
        serverSelectionTimeoutMS: 3000,
      });
      logger.info(`Successfully connected to local MongoDB fallback at [${localFallbackUri}]`);
    } catch (localError: any) {
      logger.error(`MongoDB database connection error: ${primaryError.message}`);
      logger.info(`Operating with local state fallback mode.`);
    }
  }
};
