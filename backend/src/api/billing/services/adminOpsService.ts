import { UserModel } from '../../auth/models/userModel.js';
import {
  listBrandBrains,
  listManagers,
} from '../../auth/services/workspaceProfiles.js';
import { listPublicAccounts, disconnectAccountById } from '../../social/services/socialAccountStore.js';
import { agentCronService } from '../../../core/ai/agentCronService.js';

function publicUserSummary(u: any) {
  const brands = listBrandBrains(u);
  const agents = listManagers(u);
  const accounts = listPublicAccounts(u.socialAccounts || []);
  const connected = accounts.filter((a) => a.connected);
  const runs = Array.isArray(u.agentRuns) ? u.agentRuns : [];
  const cron = agentCronService.status(u);
  return {
    id: String(u._id),
    name: u.name,
    email: u.email,
    role: u.role,
    subscriptionTierSlug: u.subscriptionTierSlug || '',
    subscriptionStatus: u.subscriptionStatus || 'inactive',
    subscriptionBypass: Boolean(u.subscriptionBypass),
    currentPeriodEnd: u.currentPeriodEnd || null,
    referralCode: u.referralCode || null,
    referredBy: u.referredBy || null,
    createdAt: u.createdAt,
    metrics: {
      brands: brands.length,
      agents: agents.length,
      socialAccounts: connected.length,
      jobsTotal: runs.length,
      jobsRunning: Boolean(cron?.running),
      cronPhase: cron?.lastPhase || 'idle',
    },
  };
}

export async function listUsersForAdmin(page = 1, limit = 20) {
  const safeLimit = Math.min(100, Math.max(1, limit));
  const safePage = Math.max(1, page);
  const total = await UserModel.countDocuments({});
  const users = await UserModel.find({})
    .sort({ createdAt: -1 })
    .skip((safePage - 1) * safeLimit)
    .limit(safeLimit);
  return {
    users: users.map((u) => publicUserSummary(u)),
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(total / safeLimit)),
  };
}

export async function getPlatformMetrics() {
  const users = await UserModel.find({});
  let brands = 0;
  let agents = 0;
  let socialAccounts = 0;
  let jobs = 0;
  let cronsRunning = 0;
  for (const u of users) {
    brands += listBrandBrains(u).length;
    agents += listManagers(u).length;
    socialAccounts += listPublicAccounts(u.socialAccounts || []).filter((a) => a.connected).length;
    jobs += Array.isArray(u.agentRuns) ? u.agentRuns.length : 0;
    if (u.aiCron?.running) cronsRunning += 1;
  }
  return {
    users: users.length,
    brands,
    agents,
    socialAccounts,
    jobs,
    cronsRunning,
  };
}

export async function getUserDetail(userId: string) {
  const u = await UserModel.findById(userId);
  if (!u) throw new Error('User not found');
  const summary = publicUserSummary(u);
  return {
    ...summary,
    brands: listBrandBrains(u),
    agents: listManagers(u),
    socialAccounts: listPublicAccounts(u.socialAccounts || []),
    cron: agentCronService.status(u),
    jobs: (Array.isArray(u.agentRuns) ? u.agentRuns : [])
      .slice()
      .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 100)
      .map((run: any) => ({
        id: run.id || run.runId,
        runId: run.runId,
        agentName: run.agentName,
        status: run.status,
        createdAt: run.createdAt,
        started: run.started,
        platforms: run.platforms || [],
        note: run.note,
        approved: run.approved,
      })),
  };
}

export async function listAllBrands(limit = 200) {
  const users = await UserModel.find({}).select('name email brandBrain brandBrains').lean();
  const rows: any[] = [];
  for (const u of users) {
    for (const brand of listBrandBrains(u)) {
      const plain = brand && typeof brand === 'object' ? { ...brand } : {};
      rows.push({
        id: String(plain.id || ''),
        brandName: String(plain.brandName || '').trim() || 'Untitled brand',
        industry: String(plain.industry || '').trim(),
        description: String(plain.description || '').trim(),
        website: String(plain.website || '').trim(),
        isActive: Boolean(plain.isActive),
        createdAt: plain.createdAt || null,
        updatedAt: plain.updatedAt || null,
        userId: String(u._id),
        userEmail: u.email || '',
        userName: u.name || '',
      });
      if (rows.length >= limit) return rows;
    }
  }
  return rows;
}

export async function listAllJobs(page = 1, limit = 20) {
  const safeLimit = Math.min(100, Math.max(1, limit));
  const safePage = Math.max(1, page);
  const users = await UserModel.find({}).select('name email agentRuns aiCron').lean();
  const rows: any[] = [];
  for (const u of users) {
    const runs = Array.isArray(u.agentRuns) ? u.agentRuns : [];
    for (const run of runs) {
      rows.push({
        userId: String(u._id),
        userEmail: u.email,
        userName: u.name,
        id: run.id || run.runId,
        runId: run.runId,
        agentName: run.agentName,
        status: run.status,
        createdAt: run.createdAt,
        platforms: run.platforms || [],
        note: run.note || '',
        cronRunning: Boolean(u.aiCron?.running),
      });
    }
  }
  rows.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  const total = rows.length;
  const start = (safePage - 1) * safeLimit;
  return {
    jobs: rows.slice(start, start + safeLimit),
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(total / safeLimit)),
  };
}

export async function listEarningsForAdmin(page = 1, limit = 20) {
  const { ReferralEarningModel } = await import('../models/referralEarningModel.js');
  const safeLimit = Math.min(100, Math.max(1, limit));
  const safePage = Math.max(1, page);
  const total = await ReferralEarningModel.countDocuments({});
  const earnings = await ReferralEarningModel.find({})
    .sort({ createdAt: -1 })
    .skip((safePage - 1) * safeLimit)
    .limit(safeLimit)
    .lean();
  return {
    earnings,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(total / safeLimit)),
  };
}

export async function stopUserJobs(userId: string) {
  return agentCronService.stop(userId);
}

export async function removeUserSocialAccount(userId: string, accountId: string) {
  return disconnectAccountById(userId, accountId);
}
