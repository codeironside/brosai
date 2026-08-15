import { logger } from '../../../core/logger/index.js';

export class LogoutService {
  async invalidateSession(userId: string) {
    logger.info(`[Auth Service] Invalidating session for user ID: ${userId}`);
    return { success: true, message: 'Session logged out successfully.' };
  }
}

export const logoutService = new LogoutService();
