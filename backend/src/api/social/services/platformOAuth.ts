import { createHmac } from 'crypto';
import { config } from '../../../core/config/index.js';
import { logger } from '../../../core/logger/index.js';

export const SUPPORTED_PLATFORMS = [
  'linkedin',
  'instagram',
  'twitter',
  'facebook',
  'threads',
  'youtube',
  'tiktok'
] as const;

export type SocialPlatform = (typeof SUPPORTED_PLATFORMS)[number];

export interface PlatformMeta {
  platform: SocialPlatform;
  name: string;
  capabilities: Record<string, boolean>;
  notes?: string;
}

export interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
  scopes?: string;
}

export interface ConnectedProfile {
  accountId: string;
  handle: string;
  displayName: string;
  avatarUrl?: string;
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
  scopes?: string;
}

export const PLATFORM_META: Record<SocialPlatform, PlatformMeta> = {
  linkedin: {
    platform: 'linkedin',
    name: 'LinkedIn Organization Page',
    capabilities: {
      publishText: true, publishMedia: true, publishVideo: true,
      readComments: true, replyComments: true,
      readDirectMessages: false, replyDirectMessages: false, analytics: true
    }
  },
  instagram: {
    platform: 'instagram',
    name: 'Instagram Business',
    capabilities: {
      publishText: true, publishMedia: true, publishVideo: true,
      readComments: true, replyComments: true,
      readDirectMessages: false, replyDirectMessages: false, analytics: true
    },
    notes: 'Instagram Graph / Instagram Login. DMs require Meta app review.'
  },
  twitter: {
    platform: 'twitter',
    name: 'X (Twitter)',
    capabilities: {
      publishText: true, publishMedia: true, publishVideo: true,
      readComments: true, replyComments: true,
      readDirectMessages: true, replyDirectMessages: true, analytics: true
    }
  },
  facebook: {
    platform: 'facebook',
    name: 'Facebook Page',
    capabilities: {
      publishText: true, publishMedia: true, publishVideo: true,
      readComments: true, replyComments: true,
      readDirectMessages: true, replyDirectMessages: true, analytics: true
    }
  },
  threads: {
    platform: 'threads',
    name: 'Threads',
    capabilities: {
      publishText: true, publishMedia: true, publishVideo: true,
      readComments: true, replyComments: true,
      readDirectMessages: false, replyDirectMessages: false, analytics: true
    },
    notes: 'Uses the Threads API on your Meta app. Add the Threads product and this callback URL.'
  },
  youtube: {
    platform: 'youtube',
    name: 'YouTube Channel',
    capabilities: {
      publishText: false, publishMedia: false, publishVideo: true,
      readComments: true, replyComments: true,
      readDirectMessages: false, replyDirectMessages: false, analytics: true
    }
  },
  tiktok: {
    platform: 'tiktok',
    name: 'TikTok Business',
    capabilities: {
      publishText: false, publishMedia: false, publishVideo: true,
      readComments: true, replyComments: false,
      readDirectMessages: false, replyDirectMessages: false, analytics: true
    }
  }
};

export const USER_DISABLED_PLATFORMS = ['instagram', 'youtube', 'tiktok'] as const;

export function isPlatformOfferedToUsers(platform: SocialPlatform): boolean {
  return !(USER_DISABLED_PLATFORMS as readonly string[]).includes(platform);
}

export function isSocialPlatform(value: string): value is SocialPlatform {
  return (SUPPORTED_PLATFORMS as readonly string[]).includes(value.toLowerCase());
}

export function normalizePlatform(value: string): SocialPlatform {
  const key = value.toLowerCase() === 'x' ? 'twitter' : value.toLowerCase();
  if (!isSocialPlatform(key)) {
    throw new Error(`Unsupported platform: ${value}`);
  }
  return key;
}

export function redirectUriFor(platform: SocialPlatform): string {
  const overrides: Record<SocialPlatform, string> = {
    linkedin: config.social.linkedin.redirectUri,
    instagram: config.social.instagram.redirectUri,
    twitter: config.social.twitter.redirectUri,
    facebook: config.social.facebook.redirectUri,
    threads: config.social.threads.redirectUri,
    youtube: config.social.youtube.redirectUri,
    tiktok: config.social.tiktok.redirectUri
  };
  return overrides[platform] || config.social.redirectUri;
}

export function assertPlatformConfigured(platform: SocialPlatform): void {
  const missing = missingCredentials(platform);
  if (missing.length) {
    throw new Error(`${PLATFORM_META[platform].name} is not configured. Missing ${missing.join(', ')}.`);
  }
}

function missingCredentials(platform: SocialPlatform): string[] {
  switch (platform) {
    case 'twitter':
      return requireFields({ TWITTER_CLIENT_ID: config.social.twitter.clientId, TWITTER_CLIENT_SECRET: config.social.twitter.clientSecret });
    case 'linkedin':
      return requireFields({ LINKEDIN_CLIENT_ID: config.social.linkedin.clientId, LINKEDIN_CLIENT_SECRET: config.social.linkedin.clientSecret });
    case 'facebook':
      return requireFields({ FACEBOOK_APP_ID: config.social.facebook.appId, FACEBOOK_APP_SECRET: config.social.facebook.appSecret });
    case 'threads':
      return requireFields({
        THREADS_APP_ID: config.social.threads.appId,
        THREADS_APP_SECRET: config.social.threads.appSecret
      });
    case 'instagram':
      if (config.social.instagram.oauthMode === 'facebook') {
        return requireFields({
          FACEBOOK_APP_ID: config.social.facebook.appId || config.social.instagram.clientId,
          FACEBOOK_APP_SECRET: config.social.facebook.appSecret || config.social.instagram.clientSecret
        });
      }
      return requireFields({
        INSTAGRAM_APP_ID: config.social.instagram.appId,
        INSTAGRAM_APP_SECRET: config.social.instagram.appSecret
      });
    case 'youtube':
      return requireFields({ YOUTUBE_CLIENT_ID: config.social.youtube.clientId, YOUTUBE_CLIENT_SECRET: config.social.youtube.clientSecret });
    case 'tiktok':
      return requireFields({ TIKTOK_CLIENT_KEY: config.social.tiktok.clientKey, TIKTOK_CLIENT_SECRET: config.social.tiktok.clientSecret });
    default:
      return ['unknown'];
  }
}

function requireFields(fields: Record<string, string>): string[] {
  return Object.entries(fields).filter(([, value]) => !value).map(([key]) => key);
}

export function buildAuthorizationUrl(params: {
  platform: SocialPlatform;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string {
  const { platform, redirectUri, state, codeChallenge } = params;
  const encodedRedirect = encodeURIComponent(redirectUri);
  const encodedState = encodeURIComponent(state);

  switch (platform) {
    case 'twitter':
      // twitter.com is required here — x.com/i/oauth2/authorize often returns
      // "You weren't able to give access to the App" before consent can render.
      return `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${encodeURIComponent(config.social.twitter.clientId)}&redirect_uri=${encodedRedirect}&scope=${encodeURIComponent('tweet.read tweet.write users.read offline.access')}&state=${encodedState}&code_challenge=${encodeURIComponent(codeChallenge)}&code_challenge_method=S256`;
    case 'linkedin':
      return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${encodeURIComponent(config.social.linkedin.clientId)}&redirect_uri=${encodedRedirect}&scope=${encodeURIComponent('openid profile email w_member_social')}&state=${encodedState}`;
    case 'instagram':
      if (config.social.instagram.oauthMode === 'facebook') {
        const appId = config.social.facebook.appId || config.social.instagram.clientId;
        return `https://www.facebook.com/v21.0/dialog/oauth?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodedRedirect}&state=${encodedState}&response_type=code&scope=${encodeURIComponent('instagram_basic,instagram_content_publish,instagram_manage_comments,instagram_manage_insights,pages_show_list,pages_read_engagement,pages_manage_posts,business_management')}`;
      }
      return `https://www.instagram.com/oauth/authorize?client_id=${encodeURIComponent(config.social.instagram.appId)}&redirect_uri=${encodedRedirect}&response_type=code&scope=${encodeURIComponent('instagram_business_basic,instagram_business_content_publish,instagram_business_manage_comments,instagram_business_manage_insights')}&state=${encodedState}`;
    case 'facebook':
      return `https://www.facebook.com/v21.0/dialog/oauth?client_id=${encodeURIComponent(config.social.facebook.appId)}&redirect_uri=${encodedRedirect}&state=${encodedState}&response_type=code&scope=${encodeURIComponent('public_profile,email,pages_show_list,pages_read_engagement,pages_manage_posts,pages_manage_engagement,pages_read_user_content,business_management')}`;
    case 'threads': {
      const threadsAppId = String(config.social.threads.appId || '').trim();
      if (!threadsAppId) {
        throw new Error('Threads App ID is missing. Set THREADS_APP_ID and restart the backend.');
      }
      const query = new URLSearchParams({
        client_id: threadsAppId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'threads_basic,threads_content_publish,threads_manage_replies,threads_read_replies,threads_manage_insights',
        state
      });
      return `https://www.threads.com/oauth/authorize?${query.toString()}`;
    }
    case 'tiktok':
      return `https://www.tiktok.com/v2/auth/authorize/?client_key=${encodeURIComponent(config.social.tiktok.clientKey)}&scope=${encodeURIComponent('user.info.basic,video.list,video.publish,video.upload')}&response_type=code&redirect_uri=${encodedRedirect}&state=${encodedState}&code_challenge=${codeChallenge}&code_challenge_method=S256`;
    case 'youtube':
      return `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${encodeURIComponent(config.social.youtube.clientId)}&redirect_uri=${encodedRedirect}&scope=${encodeURIComponent('https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly')}&state=${encodedState}&access_type=offline&prompt=consent&include_granted_scopes=true&code_challenge=${codeChallenge}&code_challenge_method=S256`;
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

export async function completeOAuth(params: {
  platform: SocialPlatform;
  code: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<ConnectedProfile> {
  const { platform, code, redirectUri, codeVerifier } = params;

  switch (platform) {
    case 'twitter':
      return connectTwitter(code, redirectUri, codeVerifier);
    case 'linkedin':
      return connectLinkedIn(code, redirectUri, codeVerifier);
    case 'facebook':
      return connectFacebook(code, redirectUri);
    case 'threads':
      return connectThreads(code, redirectUri);
    case 'instagram':
      return config.social.instagram.oauthMode === 'facebook'
        ? connectInstagramViaFacebook(code, redirectUri)
        : connectInstagramLogin(code, redirectUri);
    case 'youtube':
      return connectYouTube(code, redirectUri, codeVerifier);
    case 'tiktok':
      return connectTikTok(code, redirectUri, codeVerifier);
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

const SOCIAL_USER_AGENT = 'vamvamvam-ai/1.0';

async function connectTwitter(code: string, redirectUri: string, codeVerifier: string): Promise<ConnectedProfile> {
  const basic = Buffer.from(`${config.social.twitter.clientId}:${config.social.twitter.clientSecret}`).toString('base64');
  const tokens = await postForm('https://api.twitter.com/2/oauth2/token', {
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
    client_id: config.social.twitter.clientId
  }, { Authorization: `Basic ${basic}` });

  if (!tokens?.access_token) {
    throw new Error('X did not return an access token');
  }

  logger.info(`[Social OAuth] X token granted scopes: ${tokens.scope || '(none)'}`);

  const auth = {
    Authorization: `Bearer ${tokens.access_token}`,
    'User-Agent': SOCIAL_USER_AGENT
  };

  // Default fields only — extra user.fields (e.g. profile_image_url) can 403 on Free apps.
  let me: any;
  try {
    me = await getJson('https://api.twitter.com/2/users/me', auth);
  } catch (firstErr: any) {
    try {
      me = await getJson('https://api.x.com/2/users/me', auth);
    } catch {
      throw firstErr;
    }
  }

  const user = me.data;
  if (!user?.id) throw new Error('X did not return a user profile');

  let avatarUrl = user.profile_image_url;
  if (!avatarUrl) {
    try {
      const extra = await getJson(
        'https://api.twitter.com/2/users/me?user.fields=profile_image_url',
        auth
      );
      avatarUrl = extra?.data?.profile_image_url;
    } catch {
      avatarUrl = undefined;
    }
  }

  return {
    accountId: String(user.id),
    handle: user.username ? `@${user.username}` : `@user_${user.id}`,
    displayName: user.name || user.username || 'X account',
    avatarUrl,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    tokenType: tokens.token_type,
    scopes: tokens.scope
  };
}

async function connectLinkedIn(code: string, redirectUri: string, _codeVerifier: string): Promise<ConnectedProfile> {
  const tokens = await postForm('https://www.linkedin.com/oauth/v2/accessToken', {
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: config.social.linkedin.clientId,
    client_secret: config.social.linkedin.clientSecret
  });

  const profile = await getJson('https://api.linkedin.com/v2/userinfo', {
    Authorization: `Bearer ${tokens.access_token}`
  });

  const handle = profile.email || profile.name || profile.sub;
  if (!profile.sub) throw new Error('LinkedIn did not return an OpenID subject');

  return {
    accountId: String(profile.sub),
    handle: handle ? String(handle) : `linkedin_${profile.sub}`,
    displayName: profile.name || 'LinkedIn member',
    avatarUrl: profile.picture,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    tokenType: tokens.token_type,
    scopes: tokens.scope
  };
}

async function connectFacebook(code: string, redirectUri: string): Promise<ConnectedProfile> {
  const shortLived = await getJson(
    `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${encodeURIComponent(config.social.facebook.appId)}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${encodeURIComponent(config.social.facebook.appSecret)}&code=${encodeURIComponent(code)}`
  );

  const longLived = await getJson(
    `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(config.social.facebook.appId)}&client_secret=${encodeURIComponent(config.social.facebook.appSecret)}&fb_exchange_token=${encodeURIComponent(shortLived.access_token)}`
  ).catch(() => shortLived);

  const userToken = longLived.access_token || shortLived.access_token;
  const pages = await graphGet(
    'https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,picture&limit=25',
    userToken,
    config.social.facebook.appSecret
  );

  const page = pages.data?.[0];
  if (!page?.id || !page.access_token) {
    throw new Error('No Facebook Page found on this account. Create or grant access to a Page, then reconnect.');
  }

  return {
    accountId: String(page.id),
    handle: page.name || `page_${page.id}`,
    displayName: page.name || 'Facebook Page',
    avatarUrl: page.picture?.data?.url,
    accessToken: page.access_token,
    refreshToken: userToken,
    expiresIn: longLived.expires_in || shortLived.expires_in,
    tokenType: 'bearer',
    scopes: 'pages'
  };
}

async function connectInstagramViaFacebook(code: string, redirectUri: string): Promise<ConnectedProfile> {
  const facebook = await connectFacebook(code, redirectUri);
  const pages = await graphGet(
    'https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,profile_picture_url,name}&limit=25',
    facebook.refreshToken || facebook.accessToken,
    config.social.facebook.appSecret
  );

  const page = (pages.data || []).find((item: any) => item.instagram_business_account?.id);
  const ig = page?.instagram_business_account;
  if (!ig?.id) {
    throw new Error('No Instagram Business account linked to a Facebook Page. Convert the IG account to Business and link it, then reconnect.');
  }

  return {
    accountId: String(ig.id),
    handle: ig.username ? `@${ig.username}` : `ig_${ig.id}`,
    displayName: ig.name || ig.username || 'Instagram Business',
    avatarUrl: ig.profile_picture_url,
    accessToken: page.access_token,
    refreshToken: facebook.refreshToken,
    expiresIn: facebook.expiresIn,
    tokenType: 'bearer',
    scopes: 'instagram'
  };
}

async function connectInstagramLogin(code: string, redirectUri: string): Promise<ConnectedProfile> {
  const shortLived = await postForm('https://api.instagram.com/oauth/access_token', {
    client_id: config.social.instagram.appId,
    client_secret: config.social.instagram.appSecret,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
    code
  });

  const shortToken = shortLived.access_token || shortLived.data?.[0]?.access_token;
  const shortUserId = shortLived.user_id || shortLived.data?.[0]?.user_id;
  if (!shortToken) throw new Error('Instagram did not return an access token');

  const longLived = await getJson(
    `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(config.social.instagram.appSecret)}&access_token=${encodeURIComponent(shortToken)}`
  ).catch(() => ({ access_token: shortToken, expires_in: shortLived.expires_in }));

  const accessToken = longLived.access_token || shortToken;
  const me = await graphGet(
    'https://graph.instagram.com/v21.0/me?fields=user_id,username,name,profile_picture_url',
    accessToken,
    config.social.instagram.appSecret
  );

  const accountId = String(me.user_id || me.id || shortUserId || '');
  if (!accountId) throw new Error('Instagram did not return a user id');

  return {
    accountId,
    handle: me.username ? `@${me.username}` : `ig_${accountId}`,
    displayName: me.name || me.username || 'Instagram',
    avatarUrl: me.profile_picture_url,
    accessToken,
    expiresIn: longLived.expires_in,
    tokenType: 'bearer',
    scopes: 'instagram_business'
  };
}

async function connectThreads(code: string, redirectUri: string): Promise<ConnectedProfile> {
  const shortLived = await postForm('https://graph.threads.net/oauth/access_token', {
    client_id: config.social.threads.appId,
    client_secret: config.social.threads.appSecret,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
    code
  });

  const shortToken = shortLived.access_token || shortLived.data?.[0]?.access_token;
  const shortUserId = shortLived.user_id || shortLived.data?.[0]?.user_id;
  if (!shortToken) throw new Error('Threads did not return an access token');

  const longLived = await graphGet(
    `https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${encodeURIComponent(config.social.threads.appSecret)}`,
    shortToken,
    config.social.threads.appSecret
  ).catch(() => ({ access_token: shortToken, expires_in: shortLived.expires_in }));

  const accessToken = longLived.access_token || shortToken;
  const me = await graphGet(
    'https://graph.threads.net/v1.0/me?fields=id,username,name,threads_profile_picture_url',
    accessToken,
    config.social.threads.appSecret
  );

  const accountId = String(me.id || shortUserId || '');
  if (!accountId) throw new Error('Threads did not return a user id');

  return {
    accountId,
    handle: me.username ? `@${me.username}` : `threads_${accountId}`,
    displayName: me.name || me.username || 'Threads',
    avatarUrl: me.threads_profile_picture_url,
    accessToken,
    expiresIn: longLived.expires_in,
    tokenType: 'bearer',
    scopes: 'threads'
  };
}

async function connectYouTube(code: string, redirectUri: string, codeVerifier: string): Promise<ConnectedProfile> {
  const tokens = await postForm('https://oauth2.googleapis.com/token', {
    code,
    client_id: config.social.youtube.clientId,
    client_secret: config.social.youtube.clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
    code_verifier: codeVerifier
  });

  const channels = await getJson(
    'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
    { Authorization: `Bearer ${tokens.access_token}` }
  );

  const channel = channels.items?.[0];
  if (!channel?.id) {
    throw new Error('No YouTube channel found on this Google account.');
  }

  return {
    accountId: String(channel.id),
    handle: channel.snippet?.customUrl || channel.snippet?.title || `yt_${channel.id}`,
    displayName: channel.snippet?.title || 'YouTube Channel',
    avatarUrl: channel.snippet?.thumbnails?.default?.url,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    tokenType: tokens.token_type,
    scopes: tokens.scope
  };
}

async function connectTikTok(code: string, redirectUri: string, codeVerifier: string): Promise<ConnectedProfile> {
  const tokens = await postForm('https://open.tiktokapis.com/v2/oauth/token/', {
    client_key: config.social.tiktok.clientKey,
    client_secret: config.social.tiktok.clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
    code_verifier: codeVerifier
  });

  const tokenBody = tokens.data || tokens;
  const accessToken = tokenBody.access_token;
  if (!accessToken) throw new Error('TikTok did not return an access token');

  const me = await getJson(
    'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url,username',
    { Authorization: `Bearer ${accessToken}` }
  );

  const user = me.data?.user || me.data || {};
  const accountId = String(user.open_id || tokenBody.open_id || '');
  if (!accountId) throw new Error('TikTok did not return an open_id');

  return {
    accountId,
    handle: user.username ? `@${user.username}` : user.display_name || `tt_${accountId}`,
    displayName: user.display_name || user.username || 'TikTok',
    avatarUrl: user.avatar_url,
    accessToken,
    refreshToken: tokenBody.refresh_token,
    expiresIn: tokenBody.expires_in,
    tokenType: tokenBody.token_type,
    scopes: Array.isArray(tokenBody.scope) ? tokenBody.scope.join(' ') : tokenBody.scope
  };
}

async function postForm(
  url: string,
  body: Record<string, string>,
  headers: Record<string, string> = {}
): Promise<any> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      'User-Agent': SOCIAL_USER_AGENT,
      ...headers
    },
    body: new URLSearchParams(body).toString()
  });
  return parseApiResponse(res, 'token exchange');
}

function appSecretProof(accessToken: string, appSecret: string) {
  return createHmac('sha256', appSecret).update(accessToken).digest('hex');
}

async function graphGet(url: string, accessToken: string, appSecret: string): Promise<any> {
  const parsed = new URL(url);
  parsed.searchParams.set('access_token', accessToken);
  parsed.searchParams.set('appsecret_proof', appSecretProof(accessToken, appSecret));
  return getJson(parsed.toString());
}

async function getJson(url: string, headers: Record<string, string> = {}): Promise<any> {
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': SOCIAL_USER_AGENT, ...headers }
  });
  return parseApiResponse(res, 'profile lookup');
}

async function parseApiResponse(res: Response, action: string): Promise<any> {
  const text = await res.text();
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  const harmlessError =
    !json.error ||
    json.error === false ||
    (typeof json.error === 'object' && (json.error.code === 'ok' || json.error.code === 0));

  if (!res.ok || json.error_description || (json.error && !harmlessError) || (json.error_code && json.error_code !== 0)) {
    const message =
      json.detail ||
      json.title ||
      json.reason ||
      json.errors?.[0]?.message ||
      json.error_description ||
      json.error?.message ||
      (typeof json.error === 'string' ? json.error : '') ||
      json.message ||
      json.raw ||
      `${action} failed (${res.status})`;
    logger.warn(`[Social OAuth] ${action} failed: ${message}`, {
      status: res.status,
      body: json
    });
    throw new Error(String(message));
  }

  return json;
}
