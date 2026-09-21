import { UserModel } from '../../auth/models/userModel.js';
import { listManagers, listBrandBrains } from '../../auth/services/workspaceProfiles.js';
import { getTierBySlug, ensureDefaultTiers } from './settingsService.js';
import type { TierLimits } from '../models/subscriptionTierModel.js';

export type LimitKind = 'brands' | 'agents' | 'socialAccounts' | 'jobsPerDay' | 'aiMessages' | 'cron';

export async function resolveUserTierLimits(user: any): Promise<{
  slug: string;
  status: string;
  limits: TierLimits;
}> {
  await ensureDefaultTiers();
  const slug = String(user?.subscriptionTierSlug || 'free').toLowerCase();
  const tier = await getTierBySlug(slug);
  const free = await getTierBySlug('free');
  const limits = (tier?.limits || free?.limits || {
    maxBrands: 1,
    maxAgents: 1,
    maxSocialAccounts: 3,
    maxJobsPerDay: 3,
    maxAiMessagesPerDay: 50,
    cronEnabled: true,
    imagesEnabled: true,
  }) as TierLimits;

  return {
    slug: tier?.slug || 'free',
    status: String(user?.subscriptionStatus || 'free'),
    limits,
  };
}

export async function assertWithinLimit(userId: string, kind: LimitKind): Promise<void> {
  const user = await UserModel.findById(userId);
  if (!user) throw new Error('User not found');

  const { limits } = await resolveUserTierLimits(user);

  if (kind === 'brands') {
    const count = listBrandBrains(user).length;
    if (count >= limits.maxBrands) {
      throw new Error(`Free/plan limit reached: max ${limits.maxBrands} brand(s). Upgrade to add more.`);
    }
  }

  if (kind === 'agents') {
    const count = listManagers(user).length;
    if (count >= limits.maxAgents) {
      throw new Error(`Plan limit reached: max ${limits.maxAgents} agent(s). Upgrade to hire more.`);
    }
  }

  if (kind === 'socialAccounts') {
    const accounts = Array.isArray(user.socialAccounts) ? user.socialAccounts : [];
    const connected = accounts.filter((a: any) => a.connected).length;
    if (connected >= limits.maxSocialAccounts) {
      throw new Error(
        `Plan limit reached: max ${limits.maxSocialAccounts} social account(s). Upgrade to connect more.`,
      );
    }
  }

  if (kind === 'cron') {
    if (!limits.cronEnabled) {
      throw new Error('Scheduled jobs are not available on your current plan. Upgrade to enable cron.');
    }
  }

  if (kind === 'jobsPerDay') {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const runs = Array.isArray(user.agentRuns) ? user.agentRuns : [];
    const today = runs.filter((r: any) => {
      const created = r.createdAt ? new Date(r.createdAt) : null;
      return created && created >= start;
    }).length;
    if (today >= limits.maxJobsPerDay) {
      throw new Error(`Daily job limit reached (${limits.maxJobsPerDay}). Upgrade or try again tomorrow.`);
    }
  }

  if (kind === 'aiMessages') {
    const dayKey = new Date().toISOString().slice(0, 10);
    const usage = (user as any).usageCounters || {};
    const count = usage.aiMessagesDay === dayKey ? Number(usage.aiMessagesCount || 0) : 0;
    if (count >= limits.maxAiMessagesPerDay) {
      throw new Error(
        `Daily AI message limit reached (${limits.maxAiMessagesPerDay}). Upgrade or try again tomorrow.`,
      );
    }
  }
}

export async function bumpAiMessageUsage(userId: string) {
  const user = await UserModel.findById(userId);
  if (!user) return;
  const dayKey = new Date().toISOString().slice(0, 10);
  const usage = (user as any).usageCounters || {};
  if (usage.aiMessagesDay !== dayKey) {
    usage.aiMessagesDay = dayKey;
    usage.aiMessagesCount = 0;
  }
  usage.aiMessagesCount = Number(usage.aiMessagesCount || 0) + 1;
  (user as any).usageCounters = usage;
  await user.save();
}
