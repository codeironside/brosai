import crypto from 'crypto';
import { UserModel } from '../../auth/models/userModel.js';
import { getTierBySlug, getAppSettings, getCreditPackBySlug } from './settingsService.js';
import { recordSubscriptionPayment } from './referralService.js';
import { getPaymentAdapter } from './payment/index.js';
import { config } from '../../../core/config/index.js';
import { logger } from '../../../core/logger/index.js';
import type { PaymentProviderId } from './payment/types.js';
import { grantPurchasedCredits, resetMonthlyUsageOnSubscribe } from './usageCreditsService.js';

export async function startCheckout(userId: string, tierSlug: string) {
  const user = await UserModel.findById(userId);
  if (!user) throw new Error('User not found');

  const slug = String(tierSlug || '').toLowerCase().trim();
  const tier = await getTierBySlug(slug);
  if (!tier || !tier.active) throw new Error('Subscription tier not found');
  if (Number(tier.price) <= 0) {
    throw new Error('This plan is not available for checkout. Choose Starter or higher.');
  }
  if (tier.contactSales) {
    throw new Error('Agency plans are custom. Contact sales to get started.');
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
      kind: 'subscription',
      providerPlanId: tier.providerPlanId || '',
    },
  });

  user.lastCheckoutTxRef = txRef;
  user.lastPaymentProvider = provider;
  user.lastCreditPackSlug = '';
  await user.save();

  return {
    link: payment.link,
    txRef: payment.txRef,
    provider,
    tierSlug: slug,
    amount: tier.price,
    currency: tier.currency || 'NGN',
    kind: 'subscription',
  };
}

export async function startCreditPackCheckout(userId: string, packSlug: string) {
  const user = await UserModel.findById(userId);
  if (!user) throw new Error('User not found');

  const slug = String(packSlug || '').toLowerCase().trim();
  const pack = await getCreditPackBySlug(slug);
  if (!pack || !pack.active) throw new Error('Credit pack not found');
  if (Number(pack.price) <= 0) throw new Error('Invalid credit pack');

  const settings = await getAppSettings();
  const provider = (settings.paymentProvider || 'monnify') as PaymentProviderId;
  const adapter = getPaymentAdapter(provider);

  const txRef = `vvcred_${userId.slice(-8)}_${slug}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const redirectUrl = `${config.app.frontendUrl}/?billing=credits`;

  const payment = await adapter.createCheckout({
    amount: Number(pack.price),
    currency: String(pack.currency || 'NGN'),
    email: user.email,
    name: user.name,
    txRef,
    redirectUrl,
    description: `${pack.name} AI credit top-up`,
    meta: {
      userId: String(user._id),
      packSlug: slug,
      kind: 'credit_pack',
      credits: String(pack.credits),
    },
  });

  user.lastCheckoutTxRef = txRef;
  user.lastPaymentProvider = provider;
  user.lastCreditPackSlug = slug;
  await user.save();

  return {
    link: payment.link,
    txRef: payment.txRef,
    provider,
    packSlug: slug,
    credits: pack.credits,
    amount: pack.price,
    currency: pack.currency || 'NGN',
    kind: 'credit_pack',
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
  await resetMonthlyUsageOnSubscribe(user);
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

export async function activateCreditPackFromPayment(input: {
  userId: string;
  packSlug: string;
  txRef: string;
  amount: number;
  currency: string;
  provider?: string;
}) {
  const pack = await getCreditPackBySlug(input.packSlug);
  if (!pack) throw new Error('Unknown credit pack');
  await grantPurchasedCredits(input.userId, Number(pack.credits || 0));
  const user = await UserModel.findById(input.userId);
  if (user) {
    user.lastCheckoutTxRef = input.txRef;
    if (input.provider) user.lastPaymentProvider = input.provider;
    user.lastCreditPackSlug = '';
    await user.save();
  }
  return { credits: pack.credits, packSlug: pack.slug };
}

export async function forceAssignTier(
  userId: string,
  tierSlug: string,
  status?: 'inactive' | 'active' | 'past_due' | 'cancelled' | 'bypassed',
  opts?: { bypass?: boolean },
) {
  const user = await UserModel.findById(userId);
  if (!user) throw new Error('User not found');
  const tier = await getTierBySlug(tierSlug);
  if (!tier) throw new Error('Tier not found');

  const periodMs = tier.interval === 'yearly' ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
  user.subscriptionTierSlug = tier.slug;
  if (opts?.bypass !== undefined) {
    user.subscriptionBypass = Boolean(opts.bypass);
  }
  if (user.subscriptionBypass) {
    user.subscriptionStatus = 'bypassed';
    user.currentPeriodEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  } else if (Number(tier.price) <= 0) {
    user.subscriptionStatus = 'inactive';
    user.currentPeriodEnd = undefined;
  } else {
    user.subscriptionStatus = status || 'active';
    user.currentPeriodEnd = new Date(Date.now() + periodMs);
  }
  await resetMonthlyUsageOnSubscribe(user);
  await user.save();
  return user;
}

export async function setSubscriptionBypass(userId: string, bypass: boolean, tierSlug?: string) {
  const user = await UserModel.findById(userId);
  if (!user) throw new Error('User not found');
  user.subscriptionBypass = Boolean(bypass);
  if (bypass) {
    if (tierSlug) {
      const tier = await getTierBySlug(tierSlug);
      if (tier) user.subscriptionTierSlug = tier.slug;
    } else if (!user.subscriptionTierSlug) {
      user.subscriptionTierSlug = 'agency';
    }
    user.subscriptionStatus = 'bypassed';
    user.currentPeriodEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  } else if (user.subscriptionStatus === 'bypassed') {
    const stillActive =
      user.currentPeriodEnd && new Date(user.currentPeriodEnd).getTime() > Date.now();
    user.subscriptionStatus = stillActive && user.subscriptionTierSlug ? 'active' : 'inactive';
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
  let packSlug = '';
  const txRef = event.txRef;
  const meta = (event as any).meta || {};
  const kind = String(meta.kind || '');

  if (txRef?.startsWith('vvcred_')) {
    packSlug = String(meta.packSlug || '');
  }

  if (!userId && txRef) {
    const byRef = await UserModel.findOne({ lastCheckoutTxRef: txRef });
    if (byRef) {
      userId = String(byRef._id);
      if (!tierSlug) tierSlug = String(byRef.subscriptionTierSlug || '');
      if (!packSlug) packSlug = String(byRef.lastCreditPackSlug || '');
    }
  }

  if (!userId && txRef?.startsWith('vv_')) {
    const parts = txRef.split('_');
    if (parts.length >= 3) tierSlug = tierSlug || parts[2];
  }
  if (!packSlug && txRef?.startsWith('vvcred_')) {
    const parts = txRef.split('_');
    if (parts.length >= 3) packSlug = packSlug || parts[2];
  }

  if (!userId) {
    logger.warn(`[Billing] ${provider} webhook missing userId for tx_ref=${txRef}`);
    return { ignored: true, reason: 'missing_user' };
  }

  if (kind === 'credit_pack' || txRef?.startsWith('vvcred_') || packSlug) {
    if (!packSlug) {
      logger.warn(`[Billing] credit pack webhook missing packSlug tx_ref=${txRef}`);
      return { ignored: true, reason: 'missing_pack' };
    }
    await activateCreditPackFromPayment({
      userId,
      packSlug,
      txRef: txRef || `${provider}_${Date.now()}`,
      amount: event.amount,
      currency: event.currency || 'NGN',
      provider,
    });
    return { ok: true, userId, packSlug, kind: 'credit_pack', provider };
  }

  if (!tierSlug) {
    logger.warn(`[Billing] subscription webhook missing tierSlug tx_ref=${txRef}`);
    return { ignored: true, reason: 'missing_tier' };
  }

  await activateSubscriptionFromPayment({
    userId,
    tierSlug,
    txRef: txRef || `${provider}_${Date.now()}`,
    amount: event.amount,
    currency: event.currency || 'NGN',
    paymentCustomerId: event.customerId,
    provider,
  });

  return { ok: true, userId, tierSlug, kind: 'subscription', provider };
}
