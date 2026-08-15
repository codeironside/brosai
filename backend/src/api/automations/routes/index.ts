import { Router } from 'express';
import { setAutopilotModeController } from '../controllers/setAutopilotMode/index.js';
import { togglePauseController } from '../controllers/togglePause/index.js';

const router = Router();

// Routes ONLY - routing to individual controllers
router.post('/mode', setAutopilotModeController);
router.post('/pause', togglePauseController);

export default router;
