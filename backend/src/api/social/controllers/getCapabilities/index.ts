import { Request, Response } from 'express';
import { socialAdapterService } from '../../services/socialAdapterService.js';
import { logger } from '../../../../core/logger/index.js';

export const getCapabilitiesController = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await socialAdapterService.getCapabilities();
    res.json({ success: true, data });
  } catch (error: any) {
    logger.error(`GetCapabilitiesController Error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to retrieve social capabilities' });
  }
};
