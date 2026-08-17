import { createHmac } from 'crypto';
import { UserModel } from '../../auth/models/userModel.js';
import { decryptSecret } from '../../../core/crypto/tokenVault.js';
import { logger } from '../../../core/logger/index.js';
import { config } from '../../../core/config/index.js';

const PUBLISHABLE = ['twitter', 'facebook', 'linkedin', 'threads'] as const;
const LIMITS: Record<string, number> = {
  twitter: 280,
  threads: 500,
  facebook: 5000,
  linkedin: 3000
};

function fitText(text: string, max: number): string {
  const value = String(text || '').trim();
  if (value.length <= max) return value;
  const cut = value.slice(0, Math.max(0, max - 1));
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.55 ? cut.slice(0, space) : cut).trim()}…`;
}

function tokenFor(account: any): string {
  if (!account?.accessTokenEnc) throw new Error(`${account?.platform || 'Account'} is not connected`);
  return decryptSecret(account.accessTokenEnc);
}

function proof(token: string, secret: string) {
  return createHmac('sha256', secret).update(token).digest('hex');
}

type GraphJson = {
  id?: string;
  error?: { message?: string };
};

async function readGraphJson(res: Response): Promise<GraphJson> {
  const parsed = await res.json().catch(() => ({}));
  return parsed && typeof parsed === 'object' ? (parsed as GraphJson) : {};
}

async function postJson(url: string, body: any, headers: Record<string, string>) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'vamvamvam-ai/1.0', ...headers },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (res.status === 201 || res.ok) {
    const restliId = res.headers.get('x-restli-id') || res.headers.get('X-RestLi-Id');
    if (restliId && !json.id) json.id = restliId;
    return json;
  }
  const message = json.detail || json.error?.message || json.message || json.title || json.raw || `Publish failed (${res.status})`;
  throw new Error(String(message));
}

export type PublishedPost = {
  platform: string;
  postId?: string;
  url?: string;
  label: string;
  ok: boolean;
};

type PublishHit = { postId?: string; url?: string; label: string };

async function publishTwitter(account: any, text: string): Promise<PublishHit> {
  const json = await postJson('https://api.twitter.com/2/tweets', { text }, {
    Authorization: `Bearer ${tokenFor(account)}`
  });
  const postId = json.data?.id ? String(json.data.id) : undefined;
  const url = postId ? `https://x.com/i/web/status/${postId}` : undefined;
  return { postId, url, label: url || 'Posted to X' };
}

async function publishFacebook(account: any, text: string): Promise<PublishHit> {
  const token = tokenFor(account);
  const secret = config.social.facebook.appSecret;
  const params = new URLSearchParams({
    message: fitText(text, LIMITS.facebook),
    access_token: token,
    appsecret_proof: proof(token, secret)
  });
  const res = await fetch(
    `https://graph.facebook.com/v21.0/${encodeURIComponent(account.accountId)}/feed?${params.toString()}`,
    { method: 'POST', headers: { Accept: 'application/json', 'User-Agent': 'vamvamvam-ai/1.0' } }
  );
  const json = await readGraphJson(res);
  if (!res.ok) throw new Error(json.error?.message || 'Facebook publish failed');
  const postId = json.id ? String(json.id) : undefined;
  return { postId, label: postId ? `Facebook post ${postId}` : 'Posted to Facebook' };
}

async function publishLinkedIn(account: any, text: string): Promise<PublishHit> {
  const token = tokenFor(account);
  const author = `urn:li:person:${account.accountId}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    'X-Restli-Protocol-Version': '2.0.0',
    'Linkedin-Version': '202507'
  };

  try {
    const json = await postJson('https://api.linkedin.com/rest/posts', {
      author,
      commentary: text,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: []
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false
    }, headers);
    const postId = json.id ? String(json.id) : undefined;
    return { postId, label: postId ? `LinkedIn post ${postId}` : 'Posted to LinkedIn' };
  } catch (err: any) {
    if (/duplicate/i.test(String(err.message || ''))) throw err;
    const json = await postJson('https://api.linkedin.com/v2/ugcPosts', {
      author,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text },
          shareMediaCategory: 'NONE'
        }
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
    }, { Authorization: `Bearer ${token}` });
    const postId = json.id ? String(json.id) : undefined;
    return { postId, label: postId ? `LinkedIn post ${postId}` : 'Posted to LinkedIn' };
  }
}

async function publishThreads(account: any, text: string): Promise<PublishHit> {
  const token = tokenFor(account);
  const secret = config.social.threads.appSecret;
  const clipped = fitText(text, LIMITS.threads);
  const createParams = new URLSearchParams({
    media_type: 'TEXT',
    text: clipped,
    access_token: token,
    appsecret_proof: proof(token, secret)
  });
  const created = await fetch(
    `https://graph.threads.net/v1.0/${encodeURIComponent(account.accountId)}/threads?${createParams.toString()}`,
    { method: 'POST', headers: { Accept: 'application/json' } }
  );
  const createdJson = await readGraphJson(created);
  if (!created.ok || !createdJson.id) throw new Error(createdJson.error?.message || 'Threads draft failed');
  const publishParams = new URLSearchParams({
    creation_id: String(createdJson.id),
    access_token: token,
    appsecret_proof: proof(token, secret)
  });
  const published = await fetch(
    `https://graph.threads.net/v1.0/${encodeURIComponent(account.accountId)}/threads_publish?${publishParams.toString()}`,
    { method: 'POST', headers: { Accept: 'application/json' } }
  );
  const publishedJson = await readGraphJson(published);
  if (!published.ok) throw new Error(publishedJson.error?.message || 'Threads publish failed');
  const postId = publishedJson.id ? String(publishedJson.id) : undefined;
  return { postId, label: postId ? `Threads post ${postId}` : 'Posted to Threads' };
}

export async function listConnectedPublishTargets(userId: string): Promise<Array<{ platform: string; handle: string }>> {
  const user = await UserModel.findById(userId);
  const accounts = user?.socialAccounts || [];
  return PUBLISHABLE
    .map((platform) => accounts.find((item: any) => item.platform === platform && item.connected && item.accessTokenEnc))
    .filter(Boolean)
    .map((item: any) => ({ platform: item.platform, handle: item.handle || item.accountId }));
}

export async function publishSocialPostDetailed(
  userId: string,
  text: string,
  platforms: string[]
): Promise<{ summary: string; posts: PublishedPost[] }> {
  const body = String(text || '').trim();
  if (!body) throw new Error('Post text is empty');
  const user = await UserModel.findById(userId);
  const accounts = user?.socialAccounts || [];
  const wanted = (platforms.length ? platforms : PUBLISHABLE).map((item) => {
    const key = String(item).toLowerCase();
    return key === 'x' ? 'twitter' : key;
  });
  const posts: PublishedPost[] = [];

  for (const platform of wanted) {
    const account = accounts.find((item: any) => item.platform === platform && item.connected && item.accessTokenEnc);
    if (!account) {
      posts.push({ platform, ok: false, label: `${platform}: not connected` });
      continue;
    }
    try {
      const posted = platform === 'twitter'
        ? await publishTwitter(account, fitText(body, LIMITS.twitter))
        : platform === 'facebook'
          ? await publishFacebook(account, body)
          : platform === 'linkedin'
            ? await publishLinkedIn(account, fitText(body, LIMITS.linkedin))
            : platform === 'threads'
              ? await publishThreads(account, body)
              : null;
      if (!posted) {
        posts.push({ platform, ok: false, label: `${platform}: not supported` });
        continue;
      }
      const prefix = platform === 'twitter' ? 'X' : platform === 'facebook' ? 'Facebook' : platform === 'linkedin' ? 'LinkedIn' : 'Threads';
      posts.push({
        platform,
        ok: true,
        postId: posted.postId,
        url: posted.url,
        label: posted.label.startsWith(prefix) ? posted.label : `${prefix}: ${posted.label}`
      });
    } catch (err: any) {
      const msg = String(err.message || '');
      if (/duplicate/i.test(msg)) {
        posts.push({ platform, ok: false, label: `${platform}: already posted` });
        continue;
      }
      logger.warn(`[Social Publish] ${platform} failed: ${err.message}`);
      posts.push({ platform, ok: false, label: `${platform}: could not post` });
    }
  }

  return { summary: posts.map((item) => item.label).join('\n'), posts };
}

export async function publishSocialPost(userId: string, text: string, platforms: string[]): Promise<string> {
  const { summary } = await publishSocialPostDetailed(userId, text, platforms);
  return summary;
}
