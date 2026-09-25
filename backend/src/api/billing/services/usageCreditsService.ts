import { UserModel } from '../../auth/models/userModel.js';
import { getCreditCosts, getCreditPackBySlug, getTierBySlug } from './settingsService.js';
import { resolveUserTierLimits } from './limitsService.js';
import type { TierLimits } from '../models/subscriptionTierModel.js';

export type CreditAction =
  | 'caption'
  | 'hashtag'
  | 'rewrite'
  | 'reply'
  | 'short_post'
  | 'long_post'
  | 'repurpose'
  | 'image'
  | 'campaign'
  | 'video';

export type MonthlyCapKind = 'posts' | 'videos' | 'replies';

function periodKeyNow() {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

export function ensureUsagePeriod(user: any) {
  const key = periodKeyNow();
  const usage = user.usageCounters || {};
  if (usage.periodKey !== key) {
    usage.periodKey = key;
    usage.aiCreditsUsed = 0;
    usage.aiPostsUsed = 0;
    usage.aiVideosUsed = 0;
    usage.aiRepliesUsed = 0;
  }
  user.usageCounters = usage;
  return usage;
}

export async function getUsageSnapshot(user: any) {
  const { slug, status, limits, bypassed, hasAccess } = await resolveUserTierLimits(user);
  const usage = ensureUsagePeriod(user);
  const monthly = Number(limits.monthlyCredits || 0);
  const used = Number(usage.aiCreditsUsed || 0);
  const purchased = Number(user.aiCreditsPurchased || 0);
  const monthlyRemaining = Math.max(0, monthly - used);
  const creditsRemaining = monthlyRemaining + purchased;

  return {
    subscriptionTierSlug: slug,
    subscriptionStatus: status,
    subscriptionBypass: bypassed,
    hasAccess,
    currentPeriodEnd: user.currentPeriodEnd || null,
    periodKey: usage.periodKey,
    limits,
    usage: {
      aiCreditsUsed: used,
      aiPostsUsed: Number(usage.aiPostsUsed || 0),
      aiVideosUsed: Number(usage.aiVideosUsed || 0),
      aiRepliesUsed: Number(usage.aiRepliesUsed || 0),
      aiMessagesDay: usage.aiMessagesDay || '',
      aiMessagesCount: Number(usage.aiMessagesCount || 0),
    },
    credits: {
      monthlyAllowance: monthly,
      monthlyUsed: used,
      monthlyRemaining,
      purchasedBalance: purchased,
      remaining: creditsRemaining,
      percentUsed: monthly > 0 ? Math.min(100, Math.round((used / monthly) * 100)) : 0,
    },
    caps: {
      socialAccounts: {
        used: Array.isArray(user.socialAccounts)
          ? user.socialAccounts.filter((a: any) => a.connected).length
          : 0,
        max: limits.maxSocialAccounts,
      },
      aiPosts: { used: Number(usage.aiPostsUsed || 0), max: limits.maxAiPostsPerMonth },
      aiVideos: { used: Number(usage.aiVideosUsed || 0), max: limits.maxAiVideosPerMonth },
      aiReplies: { used: Number(usage.aiRepliesUsed || 0), max: limits.maxAiRepliesPerMonth },
      schedulingDays: limits.schedulingDays,
    },
  };
}

export async function assertSubscriptionAccess(user: any) {
  const resolved = await resolveUserTierLimits(user);
  if (!resolved.hasAccess) {
    throw new Error('An active Starter plan (or higher) is required. Upgrade to continue, or ask an admin for access.');
  }
  return resolved;
}

export async function getActionCreditCost(action: CreditAction): Promise<number> {
  const costs = await getCreditCosts();
  return Math.max(0, Number(costs[action] ?? 1));
}

export async function assertAndConsumeCredits(
  userId: string,
  action: CreditAction,
  opts?: { count?: number; alsoBump?: MonthlyCapKind },
) {
  const user = await UserModel.findById(userId);
  if (!user) throw new Error('User not found');

  await assertSubscriptionAccess(user);

  const count = Math.max(1, Number(opts?.count || 1));
  const unit = await getActionCreditCost(action);
  const need = unit * count;

  const usage = ensureUsagePeriod(user);
  const { limits } = await resolveUserTierLimits(user);

  if (opts?.alsoBump === 'posts' && Number(usage.aiPostsUsed || 0) + count > limits.maxAiPostsPerMonth) {
    throw new Error(
      `Monthly AI post limit reached (${limits.maxAiPostsPerMonth}). Upgrade or buy extra credits after switching plans.`,
    );
  }
  if (opts?.alsoBump === 'videos') {
    if (!limits.videosEnabled) throw new Error('AI video is not available on your plan.');
    if (Number(usage.aiVideosUsed || 0) + count > limits.maxAiVideosPerMonth) {
      throw new Error(`Monthly AI video limit reached (${limits.maxAiVideosPerMonth}). Upgrade to continue.`);
    }
  }
  if (opts?.alsoBump === 'replies' && Number(usage.aiRepliesUsed || 0) + count > limits.maxAiRepliesPerMonth) {
    throw new Error(`Monthly AI reply limit reached (${limits.maxAiRepliesPerMonth}). Upgrade to continue.`);
  }

  if (action === 'image' && !limits.imagesEnabled) {
    throw new Error('AI images are not available on your plan.');
  }
  if (action === 'video' && !limits.videosEnabled) {
    throw new Error('AI video is not available on your plan.');
  }

  const monthly = Number(limits.monthlyCredits || 0);
  let used = Number(usage.aiCreditsUsed || 0);
  let purchased = Number(user.aiCreditsPurchased || 0);
  let remaining = Math.max(0, monthly - used) + purchased;

  if (need > remaining) {
    throw new Error(
      `You've used all your AI credits for this month (${remaining} left, need ${need}). Upgrade your plan or buy extra credits.`,
    );
  }

  // Spend monthly allowance first, then purchased
  const fromMonthly = Math.min(Math.max(0, monthly - used), need);
  used += fromMonthly;
  const fromPurchased = need - fromMonthly;
  purchased = Math.max(0, purchased - fromPurchased);

  usage.aiCreditsUsed = used;
  if (opts?.alsoBump === 'posts') usage.aiPostsUsed = Number(usage.aiPostsUsed || 0) + count;
  if (opts?.alsoBump === 'videos') usage.aiVideosUsed = Number(usage.aiVideosUsed || 0) + count;
  if (opts?.alsoBump === 'replies') usage.aiRepliesUsed = Number(usage.aiRepliesUsed || 0) + count;

  user.usageCounters = usage;
  user.aiCreditsPurchased = purchased;
  await user.save();

  return { spent: need, action, remaining: Math.max(0, monthly - used) + purchased };
}

export async function grantPurchasedCredits(userId: string, credits: number) {
  const user = await UserModel.findById(userId);
  if (!user) throw new Error('User not found');
  user.aiCreditsPurchased = Number(user.aiCreditsPurchased || 0) + Math.max(0, credits);
  await user.save();
  return user;
}

export async function resetMonthlyUsageOnSubscribe(user: any, limits?: TierLimits) {
  const usage = user.usageCounters || {};
  usage.periodKey = periodKeyNow();
  usage.aiCreditsUsed = 0;
  usage.aiPostsUsed = 0;
  usage.aiVideosUsed = 0;
  usage.aiRepliesUsed = 0;
  user.usageCounters = usage;
  // Optional: leave purchased credits intact
  void limits;
}

export async function resolveCreditPack(slug: string) {
  const pack = await getCreditPackBySlug(slug);
  if (!pack || !pack.active) throw new Error('Credit pack not found');
  return pack;
}

export async function resolveTierOrThrow(slug: string) {
  const tier = await getTierBySlug(slug);
  if (!tier || !tier.active) throw new Error('Subscription tier not found');
  return tier;
}
