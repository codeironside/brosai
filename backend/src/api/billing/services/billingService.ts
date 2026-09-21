import crypto from 'crypto';
import { UserModel } from '../../auth/models/userModel.js';
import { getTierBySlug, getAppSettings } from './settingsService.js';
import { recordSubscriptionPayment } from './referralService.js';
import { getPaymentAdapter } from './payment/index.js';
import { config } from '../../../core/config/index.js';
import { logger } from '../../../core/logger/index.js';
import type { PaymentProviderId } from './payment/types.js';

export async function startCheckout(userId: string, tierSlug: string) {
  const user = await UserModel.findById(userId);
  if (!user) throw new Error('User not found');

  const slug = String(tierSlug || '').toLowerCase().trim();
  const tier = await getTierBySlug(slug);
  if (!tier || !tier.active) throw new Error('Subscription tier not found');
  if (Number(tier.price) <= 0) {
    user.subscriptionTierSlug = 'free';
    user.subscriptionStatus = 'free';
    user.currentPeriodEnd = undefined;
    await user.save();
    return { link: null, tierSlug: 'free', message: 'Switched to free tier' };
  }

  const settings = await getAppSettings();
  const provider = (settings.paymentProvider || 'monnify') as PaymentProviderId;
  const adapter = getPaymentAdapter(provider);

  const txRef = `vv_${userId.slice(-8)}_${slug}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const redirectUrl = `${config.app.frontendUrl}/?billing=return`;

  const payment = await adapter.createCheckout({
    amount: Number(tier.price),
    currency: String(tier.currency || 'NGN'),
    email: user.email,
    name: user.name,
    txRef,
    redirectUrl,
    description: `${tier.name} subscription`,
    meta: {
      userId: String(user._id),
      tierSlug: slug,
      providerPlanId: tier.providerPlanId || '',
    },
  });

  user.lastCheckoutTxRef = txRef;
  user.lastPaymentProvider = provider;
  await user.save();

  return {
    link: payment.link,
    txRef: payment.txRef,
    provider,
    tierSlug: slug,
    amount: tier.price,
    currency: tier.currency || 'NGN',
  };
}

export async function activateSubscriptionFromPayment(input: {
  userId: string;
  tierSlug: string;
  txRef: string;
  amount: number;
  currency: string;
  paymentCustomerId?: string;
  provider?: string;
}) {
  const user = await UserModel.findById(input.userId);
  if (!user) throw new Error('User not found');

  const tier = await getTierBySlug(input.tierSlug);
  if (!tier) throw new Error('Unknown tier');

  // One-time checkout that renews: extend period by interval; user pays again when period ends
  const periodMs = tier.interval === 'yearly' ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
  const base =
    user.currentPeriodEnd && new Date(user.currentPeriodEnd).getTime() > Date.now()
      ? new Date(user.currentPeriodEnd).getTime()
      : Date.now();

  user.subscriptionTierSlug = tier.slug;
  user.subscriptionStatus = 'active';
  user.currentPeriodEnd = new Date(base + periodMs);
  user.lastCheckoutTxRef = input.txRef;
  if (input.paymentCustomerId) user.paymentCustomerId = input.paymentCustomerId;
  if (input.provider) user.lastPaymentProvider = input.provider;
  await user.save();

  await recordSubscriptionPayment({
    userId: String(user._id),
    amount: input.amount,
    currency: input.currency,
    txRef: input.txRef,
    tierSlug: tier.slug,
  });

  return user;
}

export async function forceAssignTier(
  userId: string,
  tierSlug: string,
  status?: 'free' | 'active' | 'past_due' | 'cancelled',
) {
  const user = await UserModel.findById(userId);
  if (!user) throw new Error('User not found');
  const tier = await getTierBySlug(tierSlug);
  if (!tier) throw new Error('Tier not found');

  const periodMs = tier.interval === 'yearly' ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
  user.subscriptionTierSlug = tier.slug;
  if (Number(tier.price) <= 0) {
    user.subscriptionStatus = 'free';
    user.currentPeriodEnd = undefined;
  } else {
    user.subscriptionStatus = status || 'active';
    user.currentPeriodEnd = new Date(Date.now() + periodMs);
  }
  await user.save();
  return user;
}

export async function handleProviderWebhook(
  provider: PaymentProviderId,
  headers: Record<string, string | string[] | undefined>,
  body: unknown,
) {
  const adapter = getPaymentAdapter(provider);
  const event = await adapter.verifyWebhook(headers, body);

  if (!event.success) {
    logger.info(`[Billing] Ignoring ${provider} webhook (not a successful payment)`);
    return { ignored: true, ...event };
  }

  let userId = event.userId || '';
  let tierSlug = event.tierSlug || '';
  const txRef = event.txRef;

  if (!userId && txRef) {
    const byRef = await UserModel.findOne({ lastCheckoutTxRef: txRef });
    if (byRef) {
      userId = String(byRef._id);
      if (!tierSlug) tierSlug = String(byRef.subscriptionTierSlug || '');
    }
  }

  if (!userId && txRef.startsWith('vv_')) {
    const parts = txRef.split('_');
    if (parts.length >= 3) tierSlug = tierSlug || parts[2];
  }

  if (!userId) {
    logger.warn(`[Billing] ${provider} webhook missing userId for tx_ref=${txRef}`);
    return { ignored: true, reason: 'missing_user' };
  }

  if (!tierSlug) tierSlug = 'free';

  await activateSubscriptionFromPayment({
    userId,
    tierSlug,
    txRef: txRef || `${provider}_${Date.now()}`,
    amount: event.amount,
    currency: event.currency || 'NGN',
    paymentCustomerId: event.customerId,
    provider,
  });

  return { ok: true, userId, tierSlug, provider };
}
