import { Router } from 'express';
import { getCapabilitiesController } from '../controllers/getCapabilities/index.js';
import { connectPlatformController } from '../controllers/connectPlatform/index.js';
import { oauthCallbackController } from '../controllers/oauthCallback/index.js';
import { avatarProxyController } from '../controllers/avatarProxy/index.js';
import { disconnectPlatformController } from '../controllers/disconnectPlatform/index.js';
import { authenticateToken } from '../../../core/middleware/rbacMiddleware.js';

const router = Router();

router.get('/avatar', avatarProxyController);
router.get('/capabilities', getCapabilitiesController);
router.get('/callback', oauthCallbackController);
router.get('/oauth/:platform/callback', oauthCallbackController);
router.post('/connect', authenticateToken, connectPlatformController);
router.get('/oauth-url', authenticateToken, connectPlatformController);
router.delete('/:platform', authenticateToken, disconnectPlatformController);

export default router;
