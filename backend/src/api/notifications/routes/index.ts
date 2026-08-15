import { Router } from 'express';
import { sendWhatsAppAlertController } from '../controllers/sendWhatsAppAlert/index.js';
import { sendEmailDigestController } from '../controllers/sendEmailDigest/index.js';
import { sendFirebaseMessageController } from '../controllers/sendFirebaseMessage/index.js';

const router = Router();

// Routes forwarding to individual controller modules
router.post('/whatsapp', sendWhatsAppAlertController);
router.post('/email', sendEmailDigestController);
router.post('/send-message', sendFirebaseMessageController);

export default router;
