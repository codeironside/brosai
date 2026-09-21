import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole } from '../../../core/middleware/rbacMiddleware.js';
import {
  getAppSettings,
  updateAppSettings,
  listActiveTiers,
  listAllTiers,
  upsertTier,
  deactivateTier,
} from '../services/settingsService.js';
import { startCheckout, handleProviderWebhook, forceAssignTier } from '../services/billingService.js';
import { ensureReferralCode, getReferralSummary } from '../services/referralService.js';
import { resolveUserTierLimits } from '../services/limitsService.js';
import { listPaymentAdapters } from '../services/payment/index.js';
import type { PaymentProviderId } from '../services/payment/types.js';
import {
  listUsersForAdmin,
  getPlatformMetrics,
  getUserDetail,
  listAllBrands,
  listAllJobs,
  listEarningsForAdmin,
  stopUserJobs,
  removeUserSocialAccount,
} from '../services/adminOpsService.js';
import { logger } from '../../../core/logger/index.js';
import { config } from '../../../core/config/index.js';

const router = Router();

router.get('/tiers', async (_req: Request, res: Response): Promise<void> => {
  try {
    const tiers = await listActiveTiers();
    res.json({ success: true, data: { tiers } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/me', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    const { UserModel } = await import('../../auth/models/userModel.js');
    const user = await UserModel.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    const code = await ensureReferralCode(user);
    const { slug, status, limits } = await resolveUserTierLimits(user);
    const referral = await getReferralSummary(userId);
    const settings = await getAppSettings();
    const shareBase = config.app.frontendUrl.replace(/\/+$/, '');
    res.json({
      success: true,
      data: {
        subscriptionTierSlug: slug,
        subscriptionStatus: status,
        currentPeriodEnd: user.currentPeriodEnd || null,
        limits,
        paymentProvider: settings.paymentProvider || 'monnify',
        referralCode: code,
        referralShareUrl: `${shareBase}/?ref=${encodeURIComponent(code)}`,
        referredBy: user.referredBy || null,
        referral,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/checkout', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    const tierSlug = String(req.body?.tierSlug || req.body?.slug || '').trim();
    if (!tierSlug) {
      res.status(400).json({ success: false, error: 'tierSlug is required' });
      return;
    }
    const result = await startCheckout(userId, tierSlug);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

async function webhookHandler(provider: PaymentProviderId, req: Request, res: Response) {
  try {
    const result = await handleProviderWebhook(provider, req.headers as any, req.body);
    res.json({ success: true, data: result });
  } catch (err: any) {
    logger.error(`[Billing webhook ${provider}] ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
}

router.post('/webhook/monnify', (req, res) => webhookHandler('monnify', req, res));
router.post('/webhook/paystack', (req, res) => webhookHandler('paystack', req, res));
/** Dispatches to the active provider from AppSettings */
router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  try {
    const settings = await getAppSettings();
    const provider = (settings.paymentProvider || 'monnify') as PaymentProviderId;
    await webhookHandler(provider, req, res);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/referral', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    const { UserModel } = await import('../../auth/models/userModel.js');
    const user = await UserModel.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    const code = await ensureReferralCode(user);
    const summary = await getReferralSummary(userId);
    const settings = await getAppSettings();
    const shareBase = config.app.frontendUrl.replace(/\/+$/, '');
    res.json({
      success: true,
      data: {
        referralCode: code,
        referralShareUrl: `${shareBase}/?ref=${encodeURIComponent(code)}`,
        commissionPercent: settings.referralCommissionPercent,
        ...summary,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const admin = [authenticateToken, requireRole('admin')] as const;

router.get('/admin/settings', ...admin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const settings = await getAppSettings();
    const tiers = await listAllTiers();
    const metrics = await getPlatformMetrics();
    res.json({
      success: true,
      data: {
        referralCommissionPercent: settings.referralCommissionPercent,
        paymentProvider: settings.paymentProvider || 'monnify',
        paymentProviders: listPaymentAdapters(),
        updatedAt: settings.updatedAt,
        updatedBy: settings.updatedBy,
        tiers,
        metrics,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/admin/settings', ...admin, async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body || {};
    const settings = await updateAppSettings(
      {
        referralCommissionPercent:
          body.referralCommissionPercent !== undefined
            ? Number(body.referralCommissionPercent)
            : undefined,
        paymentProvider: body.paymentProvider,
      },
      req.user?.email || req.user?.id || '',
    );
    res.json({
      success: true,
      data: {
        referralCommissionPercent: settings.referralCommissionPercent,
        paymentProvider: settings.paymentProvider,
        updatedAt: settings.updatedAt,
        updatedBy: settings.updatedBy,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/admin/tiers', ...admin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const tiers = await listAllTiers();
    res.json({ success: true, data: { tiers } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/admin/tiers', ...admin, async (req: Request, res: Response): Promise<void> => {
  try {
    const tier = await upsertTier(req.body || {});
    res.json({ success: true, data: { tier } });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/admin/tiers/:id', ...admin, async (req: Request, res: Response): Promise<void> => {
  try {
    const tier = await upsertTier(req.body || {}, req.params.id);
    res.json({ success: true, data: { tier } });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/admin/tiers/:id/deactivate', ...admin, async (req: Request, res: Response): Promise<void> => {
  try {
    const tier = await deactivateTier(req.params.id);
    res.json({ success: true, data: { tier } });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/admin/users', ...admin, async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const page = Math.max(1, Number(req.query.page) || 1);
    const data = await listUsersForAdmin(page, limit);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/admin/users/:id', ...admin, async (req: Request, res: Response): Promise<void> => {
  try {
    const detail = await getUserDetail(req.params.id);
    res.json({ success: true, data: detail });
  } catch (err: any) {
    res.status(404).json({ success: false, error: err.message });
  }
});

router.post('/admin/users/:id/force-tier', ...admin, async (req: Request, res: Response): Promise<void> => {
  try {
    const tierSlug = String(req.body?.tierSlug || '').trim();
    if (!tierSlug) {
      res.status(400).json({ success: false, error: 'tierSlug is required' });
      return;
    }
    const user = await forceAssignTier(req.params.id, tierSlug, req.body?.status);
    res.json({
      success: true,
      data: {
        id: String(user._id),
        subscriptionTierSlug: user.subscriptionTierSlug,
        subscriptionStatus: user.subscriptionStatus,
        currentPeriodEnd: user.currentPeriodEnd,
      },
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/admin/users/:id/stop-jobs', ...admin, async (req: Request, res: Response): Promise<void> => {
  try {
    const cron = await stopUserJobs(req.params.id);
    res.json({ success: true, data: cron, message: 'User jobs stopped' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.delete(
  '/admin/users/:id/social-accounts/:accountId',
  ...admin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const accounts = await removeUserSocialAccount(
        req.params.id,
        decodeURIComponent(req.params.accountId),
      );
      res.json({ success: true, data: { accounts }, message: 'Account removed' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  },
);

router.get('/admin/brands', ...admin, async (req: Request, res: Response): Promise<void> => {
  try {
    const brands = await listAllBrands(Math.min(500, Number(req.query.limit) || 200));
    res.json({ success: true, data: { brands } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/admin/jobs', ...admin, async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const page = Math.max(1, Number(req.query.page) || 1);
    const data = await listAllJobs(page, limit);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/admin/earnings', ...admin, async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const page = Math.max(1, Number(req.query.page) || 1);
    const data = await listEarningsForAdmin(page, limit);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
