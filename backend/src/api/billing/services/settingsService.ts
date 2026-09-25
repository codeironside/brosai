import { AppSettingsModel, DEFAULT_CREDIT_COSTS } from '../models/appSettingsModel.js';
import { SubscriptionTierModel } from '../models/subscriptionTierModel.js';
import { CreditPackModel } from '../models/creditPackModel.js';
import { PLAN_SEEDS, CREDIT_PACK_SEEDS } from '../data/planCatalog.js';
import type { PaymentProviderId } from './payment/types.js';

/** Increment when plan catalog in code should overwrite DB again */
export const PLANS_CATALOG_VERSION = 2;

function normalizeCreditCosts(raw: unknown): Record<string, number> {
  const base = { ...DEFAULT_CREDIT_COSTS };
  if (!raw) return base;
  const obj =
    raw instanceof Map
      ? Object.fromEntries(raw.entries())
      : typeof raw === 'object'
        ? (raw as Record<string, unknown>)
        : {};
  for (const [k, v] of Object.entries(obj)) {
    const n = Number(v);
    if (Number.isFinite(n) && n >= 0) base[k] = n;
  }
  return base;
}

/** Seed/overwrite public plans + credit packs when catalog version bumps. */
export async function ensureDefaultTiers() {
  const settings = await getAppSettings();
  const currentVersion = Number(settings.plansCatalogVersion || 0);

  // Heal legacy free status so document saves don't fail enum validation
  try {
    const { UserModel } = await import('../../auth/models/userModel.js');
    await UserModel.updateMany(
      { subscriptionStatus: 'free' },
      { $set: { subscriptionStatus: 'inactive' } },
    );
    await UserModel.updateMany(
      { subscriptionTierSlug: { $in: ['free', 'basic'] } },
      { $set: { subscriptionTierSlug: '' } },
    );
  } catch {
    /* ignore */
  }

  if (currentVersion >= PLANS_CATALOG_VERSION) return;

  const now = new Date();

  for (const plan of PLAN_SEEDS) {
    await SubscriptionTierModel.findOneAndUpdate(
      { slug: plan.slug },
      {
        $set: {
          ...plan,
          providerPlanId: '',
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );
  }

  await SubscriptionTierModel.updateMany(
    { slug: { $in: ['free', 'basic'] } },
    { $set: { active: false, updatedAt: now } },
  );

  for (const pack of CREDIT_PACK_SEEDS) {
    await CreditPackModel.findOneAndUpdate(
      { slug: pack.slug },
      {
        $set: { ...pack, updatedAt: now },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );
  }

  if (!settings.creditCosts || (settings.creditCosts instanceof Map && settings.creditCosts.size === 0)) {
    settings.creditCosts = new Map(Object.entries(DEFAULT_CREDIT_COSTS)) as any;
  }
  settings.plansCatalogVersion = PLANS_CATALOG_VERSION;
  settings.updatedAt = now;
  await settings.save();
}

export async function getAppSettings() {
  let doc = await AppSettingsModel.findOne({ key: 'default' });
  if (!doc) {
    doc = await AppSettingsModel.create({
      key: 'default',
      referralCommissionPercent: 0,
      paymentProvider: 'monnify',
      creditCosts: DEFAULT_CREDIT_COSTS,
      updatedAt: new Date(),
    });
  }
  if (!doc.paymentProvider) {
    doc.paymentProvider = 'monnify';
    await doc.save();
  }
  if (!doc.creditCosts || (doc.creditCosts instanceof Map && doc.creditCosts.size === 0)) {
    doc.creditCosts = new Map(Object.entries(DEFAULT_CREDIT_COSTS)) as any;
    await doc.save();
  }
  return doc;
}

export async function getCreditCosts(): Promise<Record<string, number>> {
  const settings = await getAppSettings();
  return normalizeCreditCosts(settings.creditCosts);
}

export async function updateAppSettings(
  input: {
    referralCommissionPercent?: number;
    paymentProvider?: PaymentProviderId;
    creditCosts?: Record<string, number>;
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
  if (input.creditCosts && typeof input.creditCosts === 'object') {
    $set.creditCosts = normalizeCreditCosts(input.creditCosts);
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
  const normalized = String(slug || '')
    .toLowerCase()
    .trim();
  if (!normalized) return null;
  return SubscriptionTierModel.findOne({ slug: normalized }).lean();
}

export async function listActiveCreditPacks() {
  await ensureDefaultTiers();
  return CreditPackModel.find({ active: true }).sort({ sortOrder: 1, price: 1 }).lean();
}

export async function listAllCreditPacks() {
  await ensureDefaultTiers();
  return CreditPackModel.find({}).sort({ sortOrder: 1, price: 1 }).lean();
}

export async function getCreditPackBySlug(slug: string): Promise<any | null> {
  await ensureDefaultTiers();
  const pack = await CreditPackModel.findOne({
    slug: String(slug || '')
      .toLowerCase()
      .trim(),
  }).lean();
  return pack as any | null;
}

export async function upsertCreditPack(payload: Record<string, unknown>, id?: string) {
  const slug = String(payload.slug || '')
    .toLowerCase()
    .trim();
  if (!slug) throw new Error('Pack slug is required');
  const data = {
    slug,
    name: String(payload.name || slug),
    description: String(payload.description || ''),
    price: Number(payload.price) || 0,
    currency: String(payload.currency || 'NGN').toUpperCase() || 'NGN',
    credits: Math.max(0, Number(payload.credits) || 0),
    active: payload.active !== false,
    sortOrder: Number(payload.sortOrder) || 0,
    updatedAt: new Date(),
  };
  if (id) {
    const updated = await CreditPackModel.findByIdAndUpdate(id, { $set: data }, { new: true });
    if (!updated) throw new Error('Credit pack not found');
    return updated;
  }
  const existing = await CreditPackModel.findOne({ slug });
  if (existing) {
    Object.assign(existing, data);
    await existing.save();
    return existing;
  }
  return CreditPackModel.create({ ...data, createdAt: new Date() });
}

function parseLimits(limitsIn: Record<string, unknown>) {
  return {
    maxBrands: Number(limitsIn.maxBrands ?? 1),
    maxAgents: Number(limitsIn.maxAgents ?? 1),
    maxSocialAccounts: Number(limitsIn.maxSocialAccounts ?? 2),
    maxJobsPerDay: Number(limitsIn.maxJobsPerDay ?? 5),
    maxAiMessagesPerDay: Number(limitsIn.maxAiMessagesPerDay ?? 50),
    cronEnabled: limitsIn.cronEnabled !== false,
    imagesEnabled: limitsIn.imagesEnabled !== false,
    videosEnabled: limitsIn.videosEnabled !== false,
    maxAiPostsPerMonth: Number(limitsIn.maxAiPostsPerMonth ?? 30),
    maxAiVideosPerMonth: Number(limitsIn.maxAiVideosPerMonth ?? 2),
    maxAiRepliesPerMonth: Number(limitsIn.maxAiRepliesPerMonth ?? 50),
    schedulingDays: Number(limitsIn.schedulingDays ?? 30),
    monthlyCredits: Number(limitsIn.monthlyCredits ?? 300),
    maxTeamMembers: Number(limitsIn.maxTeamMembers ?? 1),
  };
}

export async function upsertTier(payload: Record<string, unknown>, id?: string) {
  const slug = String(payload.slug || '')
    .toLowerCase()
    .trim();
  if (!slug) throw new Error('Tier slug is required');

  const limitsIn = (payload.limits || {}) as Record<string, unknown>;
  const featuresRaw = payload.features;
  const features = Array.isArray(featuresRaw)
    ? featuresRaw.map((f) => String(f)).filter(Boolean)
    : String(featuresRaw || '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

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
    badge: String(payload.badge || ''),
    contactSales: Boolean(payload.contactSales),
    features,
    limits: parseLimits(limitsIn),
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

/** Re-show a soft-deactivated plan on pricing. */
export async function activateTier(id: string) {
  const updated = await SubscriptionTierModel.findByIdAndUpdate(
    id,
    { $set: { active: true, updatedAt: new Date() } },
    { new: true },
  );
  if (!updated) throw new Error('Tier not found');
  return updated;
}
