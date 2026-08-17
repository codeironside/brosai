import { createApp } from './app/index.js';
import { config } from './core/config/index.js';
import { connectDatabase, disconnectDatabase } from './core/db/index.js';
import { logger } from './core/logger/index.js';
import { agentCronService } from './core/ai/agentCronService.js';

const assertProductionSecrets = () => {
  if (config.app.env !== 'production') return;
  const weak = [
    !process.env.JWT_SECRET || process.env.JWT_SECRET.includes('dev_jwt'),
    !process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.includes('dev_jwt'),
    !process.env.TOKEN_ENCRYPTION_KEY || process.env.TOKEN_ENCRYPTION_KEY.length < 32,
    !process.env.DB_URI,
  ];
  if (weak.some(Boolean)) {
    throw new Error('Production refused to start: set strong JWT_SECRET, JWT_REFRESH_SECRET, TOKEN_ENCRYPTION_KEY (32+ chars), and DB_URI.');
  }
};

const startServer = async () => {
  logger.info(`Starting Bros AI Backend Server in [${config.app.env.toUpperCase()}] environment...`);
  assertProductionSecrets();

  await connectDatabase();

  const app = createApp();

  const server = app.listen(config.app.port, config.app.host, () => {
    logger.info(`🚀 Bros AI Backend Express App actively listening on http://${config.app.host}:${config.app.port}`);
    logger.info(`Allowed CORS Origins: ${config.cors.origins.join(', ')}`);
    agentCronService.resumeAll().catch((err) => logger.warn(`AI cron resume failed: ${err.message}`));
  });

  let closing = false;
  const shutdown = async (signal: string) => {
    if (closing) return;
    closing = true;
    logger.info(`Received ${signal}. Stopping crons and closing the server…`);
    try {
      await agentCronService.gracefulShutdown();
    } catch (err: any) {
      logger.warn(`Cron shutdown warning: ${err.message}`);
    }
    server.close(async () => {
      try {
        await disconnectDatabase();
      } catch (err: any) {
        logger.warn(`Database disconnect warning: ${err.message}`);
      }
      logger.info('HTTP server closed');
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 15000).unref();
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
};

startServer().catch(err => {
  logger.error(`Fatal Server Bootstrap Crash: ${err.message}`);
});
