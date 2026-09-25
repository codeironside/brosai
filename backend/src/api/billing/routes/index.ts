import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole } from '../../../core/middleware/rbacMiddleware.js';
import {
  getAppSettings,
  updateAppSettings,
  listActiveTiers,
  listAllTiers,
  upsertTier,
  deactivateTier,
  activateTier,
  getCreditCosts,
  listActiveCreditPacks,
  listAllCreditPacks,
  upsertCreditPack,
} from '../services/settingsService.js';
import {
  startCheckout,
  startCreditPackCheckout,
  handleProviderWebhook,
  forceAssignTier,
  setSubscriptionBypass,
} from '../services/billingService.js';
import { ensureReferralCode, getReferralSummary } from '../services/referralService.js';
import { getUsageSnapshot } from '../services/usageCreditsService.js';
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

router.get('/credit-packs', async (_req: Request, res: Response): Promise<void> => {
  try {
    const packs = await listActiveCreditPacks();
    const creditCosts = await getCreditCosts();
    res.json({ success: true, data: { packs, creditCosts } });
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
    const usage = await getUsageSnapshot(user);
    const referral = await getReferralSummary(userId);
    const settings = await getAppSettings();
    const creditCosts = await getCreditCosts();
    const shareBase = config.app.publicSiteUrl.replace(/\/+$/, '');
    await user.save();
    res.json({
      success: true,
      data: {
        ...usage,
        paymentProvider: settings.paymentProvider || 'monnify',
        creditCosts,
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

router.post('/checkout/credits', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    const packSlug = String(req.body?.packSlug || req.body?.slug || '').trim();
    if (!packSlug) {
      res.status(400).json({ success: false, error: 'packSlug is required' });
      return;
    }
    const result = await startCreditPackCheckout(userId, packSlug);
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
    const shareBase = config.app.publicSiteUrl.replace(/\/+$/, '');
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
    const creditPacks = await listAllCreditPacks();
    const creditCosts = await getCreditCosts();
    const metrics = await getPlatformMetrics();
    res.json({
      success: true,
      data: {
        referralCommissionPercent: settings.referralCommissionPercent,
        paymentProvider: settings.paymentProvider || 'monnify',
        paymentProviders: listPaymentAdapters(),
        creditCosts,
        creditPacks,
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
        creditCosts: body.creditCosts,
      },
      req.user?.email || req.user?.id || '',
    );
    res.json({
      success: true,
      data: {
        referralCommissionPercent: settings.referralCommissionPercent,
        paymentProvider: settings.paymentProvider,
        creditCosts: await getCreditCosts(),
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

router.post('/admin/tiers/:id/activate', ...admin, async (req: Request, res: Response): Promise<void> => {
  try {
    const tier = await activateTier(req.params.id);
    res.json({ success: true, data: { tier } });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/admin/credit-packs', ...admin, async (req: Request, res: Response): Promise<void> => {
  try {
    const pack = await upsertCreditPack(req.body || {});
    res.json({ success: true, data: { pack } });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/admin/credit-packs/:id', ...admin, async (req: Request, res: Response): Promise<void> => {
  try {
    const pack = await upsertCreditPack(req.body || {}, req.params.id);
    res.json({ success: true, data: { pack } });
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
    const user = await forceAssignTier(req.params.id, tierSlug, req.body?.status, {
      bypass: req.body?.bypass,
    });
    res.json({
      success: true,
      data: {
        id: String(user._id),
        subscriptionTierSlug: user.subscriptionTierSlug,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionBypass: user.subscriptionBypass,
        currentPeriodEnd: user.currentPeriodEnd,
      },
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/admin/users/:id/bypass', ...admin, async (req: Request, res: Response): Promise<void> => {
  try {
    const bypass = Boolean(req.body?.bypass);
    const tierSlug = req.body?.tierSlug ? String(req.body.tierSlug).trim() : undefined;
    const user = await setSubscriptionBypass(req.params.id, bypass, tierSlug);
    res.json({
      success: true,
      data: {
        id: String(user._id),
        subscriptionBypass: user.subscriptionBypass,
        subscriptionTierSlug: user.subscriptionTierSlug,
        subscriptionStatus: user.subscriptionStatus,
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

router.get('/admin/metrics', ...admin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const metrics = await getPlatformMetrics();
    res.json({ success: true, data: metrics });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
