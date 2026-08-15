import express, { Express, Request, Response, NextFunction } from 'express';
import { corsMiddleware } from '../core/cors/index.js';
import { logger } from '../core/logger/index.js';

// Import Sub-Business Routes
import authRoutes from '../api/auth/routes/index.js';
import automationsRoutes from '../api/automations/routes/index.js';
import socialRoutes from '../api/social/routes/index.js';
import postsRoutes from '../api/posts/routes/index.js';
import inboxRoutes from '../api/inbox/routes/index.js';
import notificationsRoutes from '../api/notifications/routes/index.js';
import { oauthCallbackController } from '../api/social/controllers/oauthCallback/index.js';

export const createApp = (): Express => {
  const app = express();
  app.set('trust proxy', 1);

  // Core Middlewares
  app.use(corsMiddleware);
  app.use(express.json({ limit: '1mb' }));

  // Request logger middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    logger.debug(`${req.method} ${req.url}`);
    next();
  });

  // Health check
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      app: 'Bros AI Express Backend',
      env: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    });
  });

  // Sub-Business Route Registries (supporting both /api/v1/* and /api/*)
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/auth', authRoutes);

  app.use('/api/v1/automations', automationsRoutes);
  app.use('/api/automations', automationsRoutes);

  app.use('/api/v1/social', socialRoutes);
  app.use('/api/social', socialRoutes);
  app.get('/api/v1/content/social/oauth/:platform/callback', oauthCallbackController);
  app.get('/api/content/social/oauth/:platform/callback', oauthCallbackController);

  app.use('/api/v1/posts', postsRoutes);
  app.use('/api/posts', postsRoutes);

  app.use('/api/v1/inbox', inboxRoutes);
  app.use('/api/inbox', inboxRoutes);

  app.use('/api/v1/notifications', notificationsRoutes);
  app.use('/api/notifications', notificationsRoutes);


  // Global 404 Route Handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.originalUrl}` });
  });

  // Global Error Handler
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error(`Global Error Handler Caught: ${err.message}`, { stack: err.stack });
    const isProd = process.env.NODE_ENV === 'production';
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      ...(isProd ? {} : { message: err.message }),
    });
  });

  return app;
};
