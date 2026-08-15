import { createApp } from './app/index.js';
import { config } from './core/config/index.js';
import { connectDatabase } from './core/db/index.js';
import { logger } from './core/logger/index.js';
import { agentCronService } from './core/ai/agentCronService.js';

const startServer = async () => {
  logger.info(`Starting Bros AI Backend Server in [${config.app.env.toUpperCase()}] environment...`);

  await connectDatabase();

  const app = createApp();

  const server = app.listen(config.app.port, () => {
    logger.info(`🚀 Bros AI Backend Express App actively listening on http://localhost:${config.app.port}`);
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
    server.close(() => {
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
