import { Request, Response } from 'express';
import { notificationDispatchService } from '../../services/notificationDispatchService.js';
import { logger } from '../../../../core/logger/index.js';

export const sendWhatsAppAlertController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, message } = req.body;
    if (!phone || !message) {
      res.status(400).json({ success: false, error: 'Phone and message are required' });
      return;
    }

    const success = await notificationDispatchService.dispatchWhatsApp(phone, message);
    res.json({ success, channel: 'whatsapp', recipient: phone });
  } catch (error: any) {
    logger.error(`SendWhatsAppAlertController Error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to send WhatsApp alert' });
  }
};
