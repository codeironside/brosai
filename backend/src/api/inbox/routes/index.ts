import { Router } from 'express';
import { getMessagesController } from '../controllers/getMessages/index.js';
import { replyMessageController } from '../controllers/replyMessage/index.js';

const router = Router();

// Routes ONLY - forwarding to individual controller modules
router.get('/', getMessagesController);
router.post('/:id/reply', replyMessageController);

export default router;
