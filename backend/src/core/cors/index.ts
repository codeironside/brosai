import cors, { CorsOptions } from 'cors';
import { config } from '../config/index.js';
import { logger } from '../logger/index.js';

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin) return callback(null, true);

    if (config.cors.origins.includes(origin) || config.app.env === 'development') {
      callback(null, true);
    } else {
      logger.warn(`CORS rejected for origin: ${origin}`);
      callback(new Error(`CORS Policy: Origin ${origin} not allowed.`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

export const corsMiddleware = cors(corsOptions);
