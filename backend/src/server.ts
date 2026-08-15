import { createApp } from './app/index.js';
import { config } from './core/config/index.js';
import { connectDatabase } from './core/db/index.js';
import { logger } from './core/logger/index.js';
import { agentCronService } from './core/ai/agentCronService.js';

const startServer = async () => {
  logger.info(`Starting Bros AI Backend Server in [${config.app.env.toUpperCase()}] environment...`);

  // Step 1: Connect to Database
  await connectDatabase();

  // Step 2: Initialize Express App
  const app = createApp();

  // Step 3: Listen on Configured Port
  app.listen(config.app.port, () => {
    logger.info(`🚀 Bros AI Backend Express App actively listening on http://localhost:${config.app.port}`);
    logger.info(`Allowed CORS Origins: ${config.cors.origins.join(', ')}`);
    agentCronService.resumeAll().catch((err) => logger.warn(`AI cron resume failed: ${err.message}`));
  });
};

startServer().catch(err => {
  logger.error(`Fatal Server Bootstrap Crash: ${err.message}`);
});
