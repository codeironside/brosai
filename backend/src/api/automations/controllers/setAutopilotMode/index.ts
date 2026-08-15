import { Request, Response } from 'express';
import { autopilotService, AutopilotMode } from '../../services/autopilotService.js';
import { logger } from '../../../../core/logger/index.js';

export const setAutopilotModeController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { mode } = req.body as { mode: AutopilotMode };
    if (!['approval', 'assisted', 'autonomous'].includes(mode)) {
      res.status(400).json({ success: false, error: 'Invalid autopilot mode specified.' });
      return;
    }

    const result = await autopilotService.setMode(mode);
    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error(`SetAutopilotModeController Error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to update autopilot mode' });
  }
};
