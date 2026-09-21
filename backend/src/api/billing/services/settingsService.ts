import { AppSettingsModel } from '../models/appSettingsModel.js';
import { SubscriptionTierModel } from '../models/subscriptionTierModel.js';
import type { PaymentProviderId } from './payment/types.js';

/** Only ensure a Free tier shell exists. Paid plans are created in Super Admin. */
async function ensureFreeTierShell() {
  const free = await SubscriptionTierModel.findOne({ slug: 'free' });
  if (free) return;
  await SubscriptionTierModel.create({
    slug: 'free',
    name: 'Free',
    description: '',
    price: 0,
    currency: 'NGN',
    interval: 'monthly',
    providerPlanId: '',
    active: true,
    sortOrder: 0,
    limits: {
      maxBrands: 1,
      maxAgents: 1,
      maxSocialAccounts: 1,
      maxJobsPerDay: 1,
      maxAiMessagesPerDay: 20,
      cronEnabled: true,
      imagesEnabled: true,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

export async function getAppSettings() {
  let doc = await AppSettingsModel.findOne({ key: 'default' });
  if (!doc) {
    doc = await AppSettingsModel.create({
      key: 'default',
      referralCommissionPercent: 0,
      paymentProvider: 'monnify',
      updatedAt: new Date(),
    });
  }
  if (!doc.paymentProvider) {
    doc.paymentProvider = 'monnify';
    await doc.save();
  }
  return doc;
}

export async function updateAppSettings(
  input: {
    referralCommissionPercent?: number;
    paymentProvider?: PaymentProviderId;
  },
  updatedBy: string,
) {
  const $set: Record<string, unknown> = {
    updatedAt: new Date(),
    updatedBy,
  };
  if (input.referralCommissionPercent !== undefined) {
    $set.referralCommissionPercent = Math.max(0, Math.min(100, Number(input.referralCommissionPercent) || 0));
  }
  if (input.paymentProvider === 'monnify' || input.paymentProvider === 'paystack') {
    $set.paymentProvider = input.paymentProvider;
  }
  const doc = await AppSettingsModel.findOneAndUpdate(
    { key: 'default' },
    { $set },
    { upsert: true, new: true },
  );
  return doc;
}

/** @deprecated use updateAppSettings */
export async function updateReferralCommissionPercent(percent: number, updatedBy: string) {
  return updateAppSettings({ referralCommissionPercent: percent }, updatedBy);
}

export async function ensureDefaultTiers() {
  await ensureFreeTierShell();
}

export async function listActiveTiers() {
  await ensureDefaultTiers();
  return SubscriptionTierModel.find({ active: true }).sort({ sortOrder: 1, price: 1 }).lean();
}

export async function listAllTiers() {
  await ensureDefaultTiers();
  return SubscriptionTierModel.find({}).sort({ sortOrder: 1, price: 1 }).lean();
}

export async function getTierBySlug(slug: string): Promise<any | null> {
  await ensureDefaultTiers();
  const normalized = String(slug || 'free').toLowerCase().trim();
  return SubscriptionTierModel.findOne({ slug: normalized }).lean();
}

export async function upsertTier(payload: Record<string, unknown>, id?: string) {
  const slug = String(payload.slug || '')
    .toLowerCase()
    .trim();
  if (!slug) throw new Error('Tier slug is required');

  const limitsIn = (payload.limits || {}) as Record<string, unknown>;
  const data = {
    slug,
    name: String(payload.name || slug),
    description: String(payload.description || ''),
    price: Number(payload.price) || 0,
    currency: String(payload.currency || 'NGN').toUpperCase() || 'NGN',
    interval: payload.interval === 'yearly' ? 'yearly' : 'monthly',
    providerPlanId: String(payload.providerPlanId || payload.flutterwavePlanId || ''),
    active: payload.active !== false,
    sortOrder: Number(payload.sortOrder) || 0,
    limits: {
      maxBrands: Number(limitsIn.maxBrands ?? 0),
      maxAgents: Number(limitsIn.maxAgents ?? 0),
      maxSocialAccounts: Number(limitsIn.maxSocialAccounts ?? 0),
      maxJobsPerDay: Number(limitsIn.maxJobsPerDay ?? 0),
      maxAiMessagesPerDay: Number(limitsIn.maxAiMessagesPerDay ?? 0),
      cronEnabled: limitsIn.cronEnabled !== false,
      imagesEnabled: limitsIn.imagesEnabled !== false,
    },
    updatedAt: new Date(),
  };

  if (id) {
    const updated = await SubscriptionTierModel.findByIdAndUpdate(id, { $set: data }, { new: true });
    if (!updated) throw new Error('Tier not found');
    return updated;
  }

  const existing = await SubscriptionTierModel.findOne({ slug });
  if (existing) {
    Object.assign(existing, data);
    await existing.save();
    return existing;
  }

  return SubscriptionTierModel.create({ ...data, createdAt: new Date() });
}

/** Soft-disable: hide from pricing, keep history. Does not hard-delete. */
export async function deactivateTier(id: string) {
  const updated = await SubscriptionTierModel.findByIdAndUpdate(
    id,
    { $set: { active: false, updatedAt: new Date() } },
    { new: true },
  );
  if (!updated) throw new Error('Tier not found');
  return updated;
}
