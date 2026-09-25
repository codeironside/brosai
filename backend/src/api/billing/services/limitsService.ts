import { UserModel } from '../../auth/models/userModel.js';
import { listManagers, listBrandBrains } from '../../auth/services/workspaceProfiles.js';
import { getTierBySlug, ensureDefaultTiers } from './settingsService.js';
import type { TierLimits } from '../models/subscriptionTierModel.js';

export type LimitKind = 'brands' | 'agents' | 'socialAccounts' | 'jobsPerDay' | 'aiMessages' | 'cron';

const EMPTY_LIMITS: TierLimits = {
  maxBrands: 0,
  maxAgents: 0,
  maxSocialAccounts: 0,
  maxJobsPerDay: 0,
  maxAiMessagesPerDay: 0,
  cronEnabled: false,
  imagesEnabled: false,
  videosEnabled: false,
  maxAiPostsPerMonth: 0,
  maxAiVideosPerMonth: 0,
  maxAiRepliesPerMonth: 0,
  schedulingDays: 0,
  monthlyCredits: 0,
  maxTeamMembers: 0,
};

function periodActive(user: any): boolean {
  if (!user?.currentPeriodEnd) return false;
  return new Date(user.currentPeriodEnd).getTime() > Date.now();
}

export async function resolveUserTierLimits(user: any): Promise<{
  slug: string;
  status: string;
  limits: TierLimits;
  bypassed: boolean;
  hasAccess: boolean;
}> {
  await ensureDefaultTiers();
  const bypassed = Boolean(user?.subscriptionBypass);
  const rawSlug = String(user?.subscriptionTierSlug || '').toLowerCase().trim();
  const rawStatus = String(user?.subscriptionStatus || 'inactive');
  const status =
    rawStatus === 'free' || rawSlug === 'free' || rawSlug === 'basic' ? 'inactive' : rawStatus;

  const hasAccess =
    bypassed ||
    status === 'bypassed' ||
    (status === 'active' && (periodActive(user) || bypassed)) ||
    (status === 'active' && !user?.currentPeriodEnd);

  // Prefer assigned tier; when bypassed with no tier, fall back to agency limits
  const slug =
    !rawSlug || rawSlug === 'free' || rawSlug === 'basic'
      ? bypassed
        ? 'agency'
        : ''
      : rawSlug;
  const tier = slug ? await getTierBySlug(slug) : null;
  const limits = (tier?.limits || EMPTY_LIMITS) as TierLimits;

  return {
    slug: tier?.slug || slug || '',
    status: bypassed ? 'bypassed' : status,
    limits: hasAccess ? limits : EMPTY_LIMITS,
    bypassed,
    hasAccess,
  };
}

export async function assertWithinLimit(userId: string, kind: LimitKind): Promise<void> {
  const user = await UserModel.findById(userId);
  if (!user) throw new Error('User not found');

  const { limits, hasAccess } = await resolveUserTierLimits(user);
  if (!hasAccess) {
    throw new Error('An active plan is required. Subscribe to Starter or higher to continue.');
  }

  if (kind === 'brands') {
    const count = listBrandBrains(user).length;
    if (count >= limits.maxBrands) {
      throw new Error(`Plan limit reached: max ${limits.maxBrands} brand(s). Upgrade to add more.`);
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
