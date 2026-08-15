import { Request, Response } from 'express';
import { socialAdapterService } from '../../services/socialAdapterService.js';
import { logger } from '../../../../core/logger/index.js';

export const disconnectPlatformController = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const platform = (req.params.platform || req.body?.platform) as string;
    if (!platform) {
      res.status(400).json({ success: false, error: 'Platform name is required' });
      return;
    }

    const accounts = await socialAdapterService.disconnect(userId, platform);
    res.json({ success: true, message: `${platform} disconnected`, data: accounts });
  } catch (error: any) {
    logger.error(`DisconnectPlatformController Error: ${error.message}`);
    res.status(400).json({ success: false, error: error.message || 'Failed to disconnect social account' });
  }
};
