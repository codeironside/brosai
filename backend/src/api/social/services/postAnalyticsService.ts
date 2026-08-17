import { createHmac } from 'crypto';
import { UserModel } from '../../auth/models/userModel.js';
import { decryptSecret } from '../../../core/crypto/tokenVault.js';
import { logger } from '../../../core/logger/index.js';
import { config } from '../../../core/config/index.js';

const MIN_INTERVAL_MS = 60_000;
const BACKOFF_MS = 15 * 60_000;
const MAX_POSTS = 8;
const GAP_MS = 400;
const UA = { Accept: 'application/json', 'User-Agent': 'vamvamvam-ai/1.0' };

export type AnalyticsSlice = {
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
};

type TrackedPost = {
  runId: string;
  platform: string;
  postId: string;
};

class RateLimitedError extends Error {
  retryAfterMs: number;
  constructor(retryAfterMs = BACKOFF_MS) {
    super('Platform rate limited analytics');
    this.retryAfterMs = retryAfterMs;
  }
}

function emptySlice(): AnalyticsSlice {
  return { impressions: 0, likes: 0, comments: 0, shares: 0 };
}

function addSlice(left: AnalyticsSlice, right: AnalyticsSlice): AnalyticsSlice {
  return {
    impressions: left.impressions + right.impressions,
    likes: left.likes + right.likes,
    comments: left.comments + right.comments,
    shares: left.shares + right.shares
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function tokenFor(account: any): string {
  if (!account?.accessTokenEnc) throw new Error(`${account?.platform || 'Account'} is not connected`);
  return decryptSecret(account.accessTokenEnc);
}

function proof(token: string, secret: string) {
  return createHmac('sha256', secret).update(token).digest('hex');
}

function num(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function parseRetryAfter(res: Response) {
  const raw = res.headers.get('retry-after');
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds > 0) return Math.min(seconds * 1000, 60 * 60_000);
  return BACKOFF_MS;
}

async function readJson(res: Response) {
  if (res.status === 429) throw new RateLimitedError(parseRetryAfter(res));
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

function parsePublishedFromTraces(traces: Array<{ label?: string }> = []): Array<{ platform: string; postId: string; url?: string }> {
  const found: Array<{ platform: string; postId: string; url?: string }> = [];
  for (const item of traces) {
    const label = String(item?.label || '');
    const twitter = label.match(/https?:\/\/(?:x|twitter)\.com\/(?:i\/web\/status|[^/\s]+)\/status\/(\d+)/i)
      || label.match(/web\/status\/(\d+)/i);
    if (twitter) {
      found.push({ platform: 'twitter', postId: twitter[1], url: `https://x.com/i/web/status/${twitter[1]}` });
      continue;
    }
    const facebook = label.match(/Facebook(?: post)?:?\s*([0-9_]+)/i);
    if (facebook) {
      found.push({ platform: 'facebook', postId: facebook[1] });
      continue;
    }
    const linkedin = label.match(/LinkedIn post\s+(\S+)/i);
    if (linkedin) {
      found.push({ platform: 'linkedin', postId: linkedin[1] });
      continue;
    }
    const threads = label.match(/Threads post\s+(\S+)/i);
    if (threads) {
      found.push({ platform: 'threads', postId: threads[1] });
    }
  }
  return found;
}

function trackedPostsForRun(run: any): TrackedPost[] {
  const runId = String(run.runId || run.id || '');
  const stored = Array.isArray(run.publishedPosts) ? run.publishedPosts : [];
  const fromStore = stored
    .filter((item: any) => item?.platform && item?.postId)
    .map((item: any) => ({
      runId,
      platform: String(item.platform).toLowerCase() === 'x' ? 'twitter' : String(item.platform).toLowerCase(),
      postId: String(item.postId)
    }));
  if (fromStore.length) return fromStore;
  return parsePublishedFromTraces(run.traces).map((item) => ({ ...item, runId }));
}

async function fetchTwitter(account: any, ids: string[]): Promise<Map<string, AnalyticsSlice>> {
  const out = new Map<string, AnalyticsSlice>();
  if (!ids.length) return out;
  const unique = [...new Set(ids)].slice(0, 100);
  const url = `https://api.twitter.com/2/tweets?ids=${encodeURIComponent(unique.join(','))}&tweet.fields=public_metrics`;
  const res = await fetch(url, { headers: { ...UA, Authorization: `Bearer ${tokenFor(account)}` } });
  const json = await readJson(res);
  for (const tweet of json.data || []) {
    const metrics = tweet.public_metrics || {};
    out.set(String(tweet.id), {
      impressions: num(metrics.impression_count),
      likes: num(metrics.like_count),
      comments: num(metrics.reply_count),
      shares: num(metrics.retweet_count) + num(metrics.quote_count)
    });
  }
  return out;
}

async function fetchFacebook(account: any, postId: string): Promise<AnalyticsSlice> {
  const token = tokenFor(account);
  const secret = config.social.facebook.appSecret;
  const auth = new URLSearchParams({
    access_token: token,
    appsecret_proof: proof(token, secret)
  });
  const slice = emptySlice();
  const insightRes = await fetch(
    `https://graph.facebook.com/v21.0/${encodeURIComponent(postId)}/insights?metric=post_impressions,post_engaged_users&${auth.toString()}`,
    { headers: UA }
  );
  const insightJson = await readJson(insightRes);
  for (const row of insightJson.data || []) {
    const value = num(row?.values?.[0]?.value);
    if (row.name === 'post_impressions') slice.impressions = value;
  }
  const engRes = await fetch(
    `https://graph.facebook.com/v21.0/${encodeURIComponent(postId)}?fields=shares,likes.summary(true),comments.summary(true)&${auth.toString()}`,
    { headers: UA }
  );
  const eng = await readJson(engRes);
  slice.likes = num(eng?.likes?.summary?.total_count);
  slice.comments = num(eng?.comments?.summary?.total_count);
  slice.shares = num(eng?.shares?.count);
  return slice;
}

async function fetchLinkedIn(account: any, postId: string): Promise<AnalyticsSlice> {
  const token = tokenFor(account);
  const encoded = encodeURIComponent(postId);
  const res = await fetch(`https://api.linkedin.com/v2/socialActions/${encoded}`, {
    headers: {
      ...UA,
      Authorization: `Bearer ${token}`,
      'X-Restli-Protocol-Version': '2.0.0'
    }
  });
  const json = await readJson(res);
  return {
    impressions: 0,
    likes: num(json?.likesSummary?.totalLikes),
    comments: num(json?.commentsSummary?.totalFirstLevelComments),
    shares: 0
  };
}

async function fetchThreads(account: any, postId: string): Promise<AnalyticsSlice> {
  const token = tokenFor(account);
  const secret = config.social.threads.appSecret;
  const auth = new URLSearchParams({
    metric: 'views,likes,replies,reposts,quotes',
    access_token: token,
    appsecret_proof: proof(token, secret)
  });
  const res = await fetch(
    `https://graph.threads.net/v1.0/${encodeURIComponent(postId)}/insights?${auth.toString()}`,
    { headers: UA }
  );
  const json = await readJson(res);
  const slice = emptySlice();
  for (const row of json.data || []) {
    const value = num(row?.values?.[0]?.value ?? row?.total_value?.value);
    if (row.name === 'views') slice.impressions = value;
    if (row.name === 'likes') slice.likes = value;
    if (row.name === 'replies') slice.comments = value;
    if (row.name === 'reposts' || row.name === 'quotes') slice.shares += value;
  }
  return slice;
}

export async function refreshPostAnalytics(userId: string): Promise<{ cached: boolean; reason?: string; updated: number }> {
  const claimed = await UserModel.findOneAndUpdate(
    {
      _id: userId,
      $and: [
        {
          $or: [
            { 'analyticsSync.backoffUntil': { $exists: false } },
            { 'analyticsSync.backoffUntil': null },
            { 'analyticsSync.backoffUntil': { $lt: new Date() } }
          ]
        },
        {
          $or: [
            { 'analyticsSync.lastAt': { $exists: false } },
            { 'analyticsSync.lastAt': null },
            { 'analyticsSync.lastAt': { $lt: new Date(Date.now() - MIN_INTERVAL_MS) } }
          ]
        }
      ]
    },
    { $set: { 'analyticsSync.lastAt': new Date() } },
    { new: true }
  );

  if (!claimed) {
    const live = await UserModel.findById(userId).lean();
    const backoff = live && (live as any).analyticsSync?.backoffUntil;
    return {
      cached: true,
      reason: backoff && new Date(backoff).getTime() > Date.now() ? 'backoff' : 'fresh',
      updated: 0
    };
  }

  const accounts = claimed.socialAccounts || [];
  const runs = [...(claimed.agentRuns || [])]
    .filter((run: any) => run.status === 'succeeded' && run.draft)
    .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const tracked: TrackedPost[] = [];
  for (const run of runs) {
    for (const post of trackedPostsForRun(run)) {
      if (tracked.length >= MAX_POSTS) break;
      tracked.push(post);
    }
    if (tracked.length >= MAX_POSTS) break;
  }

  if (!tracked.length) {
    return { cached: false, reason: 'none', updated: 0 };
  }

  const byPlatform: Record<string, TrackedPost[]> = {};
  for (const post of tracked) {
    (byPlatform[post.platform] ||= []).push(post);
  }

  const metrics = new Map<string, AnalyticsSlice>();
  const keyFor = (platform: string, postId: string) => `${platform}:${postId}`;

  try {
    const twitterIds = (byPlatform.twitter || []).map((item) => item.postId);
    const twitterAccount = accounts.find((item: any) => item.platform === 'twitter' && item.connected && item.accessTokenEnc);
    if (twitterAccount && twitterIds.length) {
      const batch = await fetchTwitter(twitterAccount, twitterIds);
      for (const [id, slice] of batch) metrics.set(keyFor('twitter', id), slice);
    }

    const staggered = [
      ...(byPlatform.facebook || []).map((post) => ({ post, fetch: () => {
        const account = accounts.find((item: any) => item.platform === 'facebook' && item.connected && item.accessTokenEnc);
        return account ? fetchFacebook(account, post.postId) : Promise.resolve(emptySlice());
      } })),
      ...(byPlatform.linkedin || []).map((post) => ({ post, fetch: () => {
        const account = accounts.find((item: any) => item.platform === 'linkedin' && item.connected && item.accessTokenEnc);
        return account ? fetchLinkedIn(account, post.postId) : Promise.resolve(emptySlice());
      } })),
      ...(byPlatform.threads || []).map((post) => ({ post, fetch: () => {
        const account = accounts.find((item: any) => item.platform === 'threads' && item.connected && item.accessTokenEnc);
        return account ? fetchThreads(account, post.postId) : Promise.resolve(emptySlice());
      } }))
    ];

    for (let i = 0; i < staggered.length; i += 1) {
      const item = staggered[i];
      try {
        metrics.set(keyFor(item.post.platform, item.post.postId), await item.fetch());
      } catch (err: any) {
        if (err instanceof RateLimitedError) throw err;
        logger.warn(`[Post analytics] ${item.post.platform} ${item.post.postId} skipped: ${err.message}`);
      }
      if (i < staggered.length - 1) await sleep(GAP_MS);
    }
  } catch (err: any) {
    if (err instanceof RateLimitedError) {
      await UserModel.updateOne(
        { _id: userId },
        { $set: { 'analyticsSync.backoffUntil': new Date(Date.now() + err.retryAfterMs) } }
      );
      logger.warn(`[Post analytics] backing off for ${Math.round(err.retryAfterMs / 1000)}s`);
      return { cached: true, reason: 'backoff', updated: 0 };
    }
    logger.warn(`[Post analytics] refresh failed: ${err.message}`);
    return { cached: false, reason: 'error', updated: 0 };
  }

  const now = new Date();
  let updated = 0;
  const ops = runs.map((run: any) => {
    const posts = trackedPostsForRun(run);
    if (!posts.length) return null;
    const byPlat: Record<string, AnalyticsSlice> = { ...(run.analyticsByPlatform || {}) };
    let totals = emptySlice();
    let touched = false;
    for (const post of posts) {
      const slice = metrics.get(keyFor(post.platform, post.postId));
      if (!slice) continue;
      byPlat[post.platform] = slice;
      touched = true;
    }
    if (!touched) return null;
    totals = Object.values(byPlat).reduce((sum, slice) => addSlice(sum, slice), emptySlice());
    updated += 1;
    return {
      updateOne: {
        filter: { _id: userId, agentRuns: { $elemMatch: { $or: [{ runId: run.runId }, { id: run.id }] } } },
        update: {
          $set: {
            'agentRuns.$.analytics': totals,
            'agentRuns.$.analyticsByPlatform': byPlat,
            'agentRuns.$.analyticsFetchedAt': now
          }
        }
      }
    };
  }).filter(Boolean);

  if (ops.length) {
    await UserModel.bulkWrite(ops as any[]);
  }

  return { cached: false, updated };
}
