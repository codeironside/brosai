import { Request, Response } from 'express';
import { logoutService } from '../../services/logoutService.js';
import { logger } from '../../../../core/logger/index.js';

export const logoutController = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.body.userId || 'usr_1';
    const result = await logoutService.invalidateSession(userId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error(`LogoutController Error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Logout failed' });
  }
};
