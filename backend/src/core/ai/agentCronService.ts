import { UserModel } from '../../api/auth/models/userModel.js';
import { activeManager, assertReadyToRun, listManagers } from '../../api/auth/services/workspaceProfiles.js';
import { logger } from '../logger/index.js';

const timers = new Map<string, NodeJS.Timeout>();
const inflight = new Set<string>();
let shuttingDown = false;

function intervalFromFrequency(freq?: string): number {
  const match = String(freq || '').match(/(\d+)\s*posts?\s*\/\s*(day|week)/i);
  if (!match) return 15 * 60 * 1000;
  const count = Math.max(1, Number(match[1]));
  const periodMs = match[2].toLowerCase() === 'week' ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  return Math.max(Math.floor(periodMs / count), 5 * 60 * 1000);
}

function cronPayload(user: any) {
  const cron = user.aiCron || {};
  return {
    running: Boolean(cron.running),
    managerId: cron.managerId || null,
    managerName: cron.managerName || null,
    postingFrequency: cron.postingFrequency || null,
    intervalMs: cron.intervalMs || 15 * 60 * 1000,
    startedAt: cron.startedAt || null,
    stoppedAt: cron.stoppedAt || null,
    lastTickAt: cron.lastTickAt || null,
    nextDueAt: cron.nextDueAt || null,
    lastPhase: cron.lastPhase || 'idle',
    lastRunId: cron.lastRunId || null,
    shutdownAt: cron.shutdownAt || null,
    tickCount: cron.tickCount || 0
  };
}

function trace(label: string) {
  return { at: new Date(), label };
}

function delayUntilNext(cron: any): number {
  const interval = Number(cron?.intervalMs) || 15 * 60 * 1000;
  const next = cron?.nextDueAt ? new Date(cron.nextDueAt).getTime() : 0;
  if (next) return Math.max(1000, next - Date.now());
  const last = cron?.lastTickAt ? new Date(cron.lastTickAt).getTime() : 0;
  if (last) return Math.max(1000, last + interval - Date.now());
  return interval;
}

async function setCron(userId: string, patch: Record<string, unknown>) {
  const $set: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    $set[`aiCron.${key}`] = value;
  }
  await UserModel.updateOne({ _id: userId }, { $set });
}

async function recoverInterrupted(userId: string, cron: any): Promise<void> {
  const runId = String(cron?.lastRunId || '');
  const phase = String(cron?.lastPhase || 'idle');
  if (!runId || (phase !== 'drafting' && phase !== 'publishing')) return;

  await UserModel.updateOne(
    { _id: userId, agentRuns: { $elemMatch: { runId, status: { $in: ['publishing', 'awaiting'] } } } },
    {
      $set: {
        'agentRuns.$.status': 'awaiting',
        'agentRuns.$.note': 'Paused when the server stopped — continue from here'
      },
      $push: { 'agentRuns.$.traces': trace('Paused on shutdown — continue from here') }
    }
  );
  await setCron(userId, { lastPhase: 'idle' });
}

async function tick(userId: string): Promise<void> {
  if (shuttingDown || inflight.has(userId)) return;
  inflight.add(userId);
  try {
    const user = await UserModel.findById(userId);
    if (!user?.aiCron?.running) {
      stopTimer(userId);
      return;
    }

    const intervalMs = Number(user.aiCron.intervalMs) || 15 * 60 * 1000;
    const dueAt = user.aiCron.nextDueAt ? new Date(user.aiCron.nextDueAt).getTime() : 0;
    const last = user.aiCron.lastTickAt ? new Date(user.aiCron.lastTickAt).getTime() : 0;
    const tooSoon = dueAt
      ? Date.now() < dueAt - 1000
      : Boolean(last && Date.now() - last < Math.max(intervalMs * 0.8, 60 * 1000));
    if (tooSoon) return;

    await setCron(userId, { lastPhase: 'drafting', shutdownAt: null });

    const { brandMemoryService } = await import('./brandMemoryService.js');
    const managerId = String(user.aiCron.managerId || '');
    let draft: { text: string; platforms: string[]; managerName: string };
    try {
      draft = await brandMemoryService.generateDryRunPost(userId, managerId);
    } catch (err: any) {
      logger.warn(`AI cron draft skipped: ${err.message}`);
      await setCron(userId, {
        lastPhase: 'idle',
        lastTickAt: new Date(),
        nextDueAt: new Date(Date.now() + intervalMs)
      });
      return;
    }

    if (shuttingDown) {
      await setCron(userId, { lastPhase: 'idle' });
      return;
    }

    const approval = user.aiManager?.autopilotMode === 'approval' ? 'manual' : 'auto';
    const runId = `cron_${Math.random().toString(36).slice(2, 8)}`;
    const run: any = {
      id: `run_${Date.now()}`,
      runId,
      agentName: draft.managerName,
      status: approval === 'manual' ? 'awaiting' : 'publishing',
      toolsCount: 1,
      latencyPercent: 40,
      tokens: '—',
      cost: '$0.00',
      approvalMode: approval,
      approved: false,
      createdAt: new Date(),
      draft: draft.text,
      platforms: draft.platforms,
      note: approval === 'manual' ? 'Cron draft — approve to publish' : 'Cron publishing',
      traces: [trace('Cron drafted a post')],
      analytics: { impressions: 0, likes: 0, comments: 0, shares: 0 }
    };

    const nextDueAt = new Date(Date.now() + intervalMs);
    await UserModel.updateOne(
      { _id: userId },
      {
        $push: { agentRuns: { $each: [run], $position: 0, $slice: 80 } },
        $set: {
          'aiCron.lastTickAt': new Date(),
          'aiCron.nextDueAt': nextDueAt,
          'aiCron.lastRunId': runId,
          'aiCron.lastPhase': approval === 'auto' ? 'publishing' : 'idle'
        },
        $inc: { 'aiCron.tickCount': 1 }
      }
    );

    if (approval === 'auto' && draft.text && draft.platforms.length && !shuttingDown) {
      const { publishSocialPost } = await import('../../api/social/services/socialPublishService.js');
      const summary = await publishSocialPost(userId, draft.text, draft.platforms);
      const live = await UserModel.findById(userId);
      const current = (live?.agentRuns || []).find((item: any) => item.runId === runId);
      if (current?.status === 'failed') {
        await setCron(userId, { lastPhase: 'idle' });
        return;
      }
      const traces = String(summary).split('\n').filter(Boolean).map((label) => trace(label));
      await UserModel.updateOne(
        { _id: userId, agentRuns: { $elemMatch: { runId } } },
        {
          $set: {
            'agentRuns.$.status': 'succeeded',
            'agentRuns.$.approved': true,
            'agentRuns.$.note': 'Cron posted'
          },
          $push: { 'agentRuns.$.traces': { $each: [...traces, trace('Cron finished')] } }
        }
      );
    }

    await setCron(userId, { lastPhase: 'idle', nextDueAt });
  } catch (err: any) {
    logger.warn(`AI cron tick failed: ${err.message}`);
    try {
      await setCron(userId, { lastPhase: 'idle' });
    } catch {
      /* keep shutdown path moving */
    }
  } finally {
    inflight.delete(userId);
  }
}

function stopTimer(userId: string) {
  const existing = timers.get(userId);
  if (existing) {
    clearTimeout(existing);
    timers.delete(userId);
  }
}

function schedule(userId: string, delayMs: number) {
  if (shuttingDown) return;
  stopTimer(userId);
  const handle = setTimeout(async () => {
    await tick(userId);
    if (shuttingDown) return;
    const user = await UserModel.findById(userId).select('aiCron');
    if (user?.aiCron?.running) {
      schedule(userId, delayUntilNext(user.aiCron));
    }
  }, Math.max(250, delayMs));
  timers.set(userId, handle);
}

async function waitForInflight(timeoutMs = 12000): Promise<void> {
  const start = Date.now();
  while (inflight.size && Date.now() - start < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
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
    const already = Boolean(user.aiCron?.running && timers.has(userId));
    const nextDueAt = already && user.aiCron?.nextDueAt
      ? user.aiCron.nextDueAt
      : new Date(Date.now() + 2500);
    user.aiCron = {
      running: true,
      managerId: manager.id,
      managerName: manager.name,
      postingFrequency: manager.postingFrequency,
      intervalMs,
      startedAt: already ? (user.aiCron?.startedAt || new Date()) : new Date(),
      stoppedAt: null,
      shutdownAt: null,
      lastTickAt: user.aiCron?.lastTickAt || null,
      nextDueAt,
      lastPhase: user.aiCron?.lastPhase || 'idle',
      lastRunId: user.aiCron?.lastRunId || null,
      tickCount: user.aiCron?.tickCount || 0
    };
    user.markModified('aiCron');
    await user.save();
    if (!already) {
      schedule(userId, delayUntilNext(user.aiCron));
    }
    return cronPayload(user);
  }

  async stop(userId: string) {
    stopTimer(userId);
    inflight.delete(userId);
    const user = await UserModel.findById(userId);
    if (!user) throw new Error('User not found');
    user.aiCron = {
      ...(user.aiCron || {}),
      running: false,
      lastPhase: 'idle',
      stoppedAt: new Date()
    };
    user.markModified('aiCron');
    await user.save();
    return cronPayload(user);
  }

  async resumeAll(): Promise<void> {
    shuttingDown = false;
    const users = await UserModel.find({ 'aiCron.running': true }).select('_id aiCron');
    for (const user of users) {
      const id = user._id.toString();
      await recoverInterrupted(id, user.aiCron);
      const delay = delayUntilNext(user.aiCron);
      schedule(id, delay);
      logger.info(`Resumed AI cron for user ${id} in ${Math.round(delay / 1000)}s`);
    }
  }

  async gracefulShutdown(): Promise<void> {
    shuttingDown = true;
    const ids = [...timers.keys()];
    ids.forEach((id) => stopTimer(id));
    const users = await UserModel.find({ 'aiCron.running': true }).select('_id aiCron');
    await Promise.all(users.map(async (user: any) => {
      const id = user._id.toString();
      const nextDueAt = user.aiCron?.nextDueAt || new Date(Date.now() + (Number(user.aiCron?.intervalMs) || 15 * 60 * 1000));
      await setCron(id, {
        shutdownAt: new Date(),
        nextDueAt,
        lastPhase: inflight.has(id) ? (user.aiCron?.lastPhase || 'drafting') : 'idle'
      });
    }));
    await waitForInflight();
    logger.info('AI crons stopped gracefully');
  }
}

export const agentCronService = new AgentCronService();
