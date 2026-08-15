import { Request, Response } from 'express';
import { autopilotService } from '../../services/autopilotService.js';
import { logger } from '../../../../core/logger/index.js';

export const togglePauseController = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await autopilotService.togglePause();
    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error(`TogglePauseController Error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to toggle emergency pause' });
  }
};
