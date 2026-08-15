import { firebaseService } from '../../../core/firebase/index.js';
import { logger } from '../../../core/logger/index.js';

export class NotificationDispatchService {
  async dispatchWhatsApp(phone: string, text: string) {
    logger.info(`[Notification Service] Triggering Firebase WhatsApp alert for ${phone}`);
    return await firebaseService.sendWhatsAppMessage(phone, text);
  }

  async dispatchEmail(to: string, subject: string, body: string) {
    logger.info(`[Notification Service] Triggering Firebase Email digest for ${to}`);
    return await firebaseService.sendEmail(to, subject, body);
  }
}

export const notificationDispatchService = new NotificationDispatchService();
