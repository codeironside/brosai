import { UserModel } from '../../api/auth/models/userModel.js';
import { activeManager, assertReadyToRun, listManagers } from '../../api/auth/services/workspaceProfiles.js';
import { logger } from '../logger/index.js';

const timers = new Map<string, NodeJS.Timeout>();

function intervalFromFrequency(freq?: string): number {
  const match = String(freq || '').match(/(\d+)\s*posts?\s*\/\s*(day|week)/i);
  if (!match) return 60_000;
  const count = Math.max(1, Number(match[1]));
  const periodMs = match[2].toLowerCase() === 'week' ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  return Math.max(Math.floor(periodMs / count), 60_000);
}

function cronPayload(user: any) {
  const cron = user.aiCron || {};
  return {
    running: Boolean(cron.running),
    managerId: cron.managerId || null,
    managerName: cron.managerName || null,
    postingFrequency: cron.postingFrequency || null,
    intervalMs: cron.intervalMs || 60_000,
    startedAt: cron.startedAt || null,
    stoppedAt: cron.stoppedAt || null,
    lastTickAt: cron.lastTickAt || null,
    tickCount: cron.tickCount || 0
  };
}

async function tick(userId: string): Promise<void> {
  const user = await UserModel.findById(userId);
  if (!user?.aiCron?.running) {
    stopTimer(userId);
    return;
  }

  const name = user.aiCron.managerName || user.aiManager?.name || 'AI Social Manager';
  const approval = user.aiManager?.autopilotMode === 'approval' ? 'manual' : 'auto';
  const run = {
    id: `run_${Date.now()}`,
    runId: `cron_${Math.random().toString(36).slice(2, 8)}`,
    agentName: name,
    status: approval === 'manual' ? 'awaiting' : 'succeeded',
    toolsCount: 2,
    latencyPercent: 42,
    tokens: '0.8k',
    cost: '$0.004',
    started: 'Just now',
    approvalMode: approval,
    approved: approval !== 'manual',
    createdAt: new Date()
  };

  user.agentRuns = user.agentRuns || [];
  user.agentRuns.unshift(run);
  user.agentRuns = user.agentRuns.slice(0, 80);
  user.aiCron.lastTickAt = new Date();
  user.aiCron.tickCount = (user.aiCron.tickCount || 0) + 1;
  user.markModified('aiCron');
  user.markModified('agentRuns');
  await user.save();
}

function stopTimer(userId: string) {
  const existing = timers.get(userId);
  if (existing) {
    clearInterval(existing);
    timers.delete(userId);
  }
}

function startTimer(userId: string, intervalMs: number) {
  stopTimer(userId);
  timers.set(userId, setInterval(() => {
    tick(userId).catch((err) => logger.warn(`AI cron tick failed: ${err.message}`));
  }, intervalMs));
}

export class AgentCronService {
  status(user: any) {
    return cronPayload(user);
  }

  async start(userId: string, managerId?: string) {
    const user = await UserModel.findById(userId);
    if (!user) throw new Error('User not found');

    const managers = listManagers(user);
    const manager = (managerId && managers.find((item: any) => item.id === managerId)) || activeManager(managers);
    if (!manager) throw new Error('Hire an AI first, then start the cron');
    assertReadyToRun(user, manager);

    const intervalMs = intervalFromFrequency(manager.postingFrequency);
    user.aiCron = {
      running: true,
      managerId: manager.id,
      managerName: manager.name,
      postingFrequency: manager.postingFrequency,
      intervalMs,
      startedAt: new Date(),
      stoppedAt: null,
      lastTickAt: new Date(),
      tickCount: user.aiCron?.tickCount || 0
    };
    user.markModified('aiCron');
    await user.save();
    startTimer(userId, intervalMs);
    await tick(userId);
    const fresh = await UserModel.findById(userId);
    return cronPayload(fresh);
  }

  async stop(userId: string) {
    stopTimer(userId);
    const user = await UserModel.findById(userId);
    if (!user) throw new Error('User not found');
    user.aiCron = {
      ...(user.aiCron || {}),
      running: false,
      stoppedAt: new Date()
    };
    user.markModified('aiCron');
    await user.save();
    return cronPayload(user);
  }

  async resumeAll(): Promise<void> {
    const users = await UserModel.find({ 'aiCron.running': true }).select('_id aiCron');
    users.forEach((user: any) => {
      const id = user._id.toString();
      startTimer(id, user.aiCron?.intervalMs || 60_000);
      logger.info(`Resumed AI cron for user ${id}`);
    });
  }
}

export const agentCronService = new AgentCronService();
