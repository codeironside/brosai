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

async function publishTwitter(account: any, text: string) {
  const json = await postJson('https://api.twitter.com/2/tweets', { text }, {
    Authorization: `Bearer ${tokenFor(account)}`
  });
  return json.data?.id ? `https://x.com/i/web/status/${json.data.id}` : 'Posted to X';
}

async function publishFacebook(account: any, text: string) {
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
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error?.message || 'Facebook publish failed');
  return json.id ? `Facebook post ${json.id}` : 'Posted to Facebook';
}

async function publishLinkedIn(account: any, text: string) {
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
    return json.id ? `LinkedIn post ${json.id}` : 'Posted to LinkedIn';
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
    return json.id ? `LinkedIn post ${json.id}` : 'Posted to LinkedIn';
  }
}

async function publishThreads(account: any, text: string) {
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
  const createdJson = await created.json().catch(() => ({}));
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
  const publishedJson = await published.json().catch(() => ({}));
  if (!published.ok) throw new Error(publishedJson.error?.message || 'Threads publish failed');
  return publishedJson.id ? `Threads post ${publishedJson.id}` : 'Posted to Threads';
}

export async function listConnectedPublishTargets(userId: string): Promise<Array<{ platform: string; handle: string }>> {
  const user = await UserModel.findById(userId);
  const accounts = user?.socialAccounts || [];
  return PUBLISHABLE
    .map((platform) => accounts.find((item: any) => item.platform === platform && item.connected && item.accessTokenEnc))
    .filter(Boolean)
    .map((item: any) => ({ platform: item.platform, handle: item.handle || item.accountId }));
}

export async function publishSocialPost(userId: string, text: string, platforms: string[]): Promise<string> {
  const body = String(text || '').trim();
  if (!body) throw new Error('Post text is empty');
  const user = await UserModel.findById(userId);
  const accounts = user?.socialAccounts || [];
  const wanted = (platforms.length ? platforms : PUBLISHABLE).map((item) => {
    const key = String(item).toLowerCase();
    return key === 'x' ? 'twitter' : key;
  });
  const results: string[] = [];

  for (const platform of wanted) {
    const account = accounts.find((item: any) => item.platform === platform && item.connected && item.accessTokenEnc);
    if (!account) {
      results.push(`${platform}: not connected`);
      continue;
    }
    try {
      if (platform === 'twitter') results.push(`X: ${await publishTwitter(account, fitText(body, LIMITS.twitter))}`);
      else if (platform === 'facebook') results.push(`Facebook: ${await publishFacebook(account, body)}`);
      else if (platform === 'linkedin') results.push(`LinkedIn: ${await publishLinkedIn(account, fitText(body, LIMITS.linkedin))}`);
      else if (platform === 'threads') results.push(`Threads: ${await publishThreads(account, body)}`);
    } catch (err: any) {
      const msg = String(err.message || '');
      if (/duplicate/i.test(msg)) {
        results.push(`${platform}: already posted`);
        continue;
      }
      logger.warn(`[Social Publish] ${platform} failed: ${err.message}`);
      results.push(`${platform}: could not post`);
    }
  }

  return results.join('\n');
}
