import { Request, Response } from 'express';
import { socialAdapterService } from '../../services/socialAdapterService.js';
import { logger } from '../../../../core/logger/index.js';

export const connectPlatformController = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const platform = (req.body?.platform || req.query.platform) as string;
    if (!platform) {
      res.status(400).json({ success: false, error: 'Platform name is required' });
      return;
    }

    const result = await socialAdapterService.startOAuth(userId, platform);
    res.json({ success: true, data: result, oauthUrl: result.oauthUrl, platform: result.platform });
  } catch (error: any) {
    logger.error(`ConnectPlatformController Error: ${error.message}`);
    res.status(400).json({ success: false, error: error.message || 'Failed to start social OAuth' });
  }
};
