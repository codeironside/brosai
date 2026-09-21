import crypto from 'crypto';
import mongoose from 'mongoose';
import { config } from '../../../core/config/index.js';
import { logger } from '../../../core/logger/index.js';
import { loginService } from './loginService.js';

const MobileAuthSchema = new mongoose.Schema({
  kind: { type: String, enum: ['state', 'ticket', 'session'], required: true },
  key: { type: String, required: true, unique: true },
  appRedirect: String,
  clientSession: String,
  referralCode: String,
  ticket: String,
  user: mongoose.Schema.Types.Mixed,
  accessToken: String,
  refreshToken: String,
  expiresAt: { type: Date, required: true },
});

MobileAuthSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const MobileAuthModel =
  mongoose.models.MobileAuthPending || mongoose.model('MobileAuthPending', MobileAuthSchema);

const TTL_MS = 15 * 60 * 1000;

function assertGoogleConfigured() {
  if (!config.google.clientId || !config.google.clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set for mobile Google sign-in');
  }
}

async function putDoc(doc: Record<string, unknown>) {
  await MobileAuthModel.findOneAndUpdate(
    { key: doc.key },
    { ...doc, expiresAt: new Date(Date.now() + TTL_MS) },
    { upsert: true, new: true },
  );
}

async function takeDoc(key: string) {
  const doc = await MobileAuthModel.findOneAndDelete({ key }).lean();
  return doc as any;
}

async function getDoc(key: string) {
  const doc = await MobileAuthModel.findOne({ key }).lean();
  return doc as any;
}

export function sanitizeAppRedirect(raw: string, callbackUrl?: string) {
  const value = String(raw || '').trim();
  if (!value) return doneUrlFromCallback(callbackUrl);
  if (/^vamvamvam:\/\//i.test(value)) return value;
  if (/^exp:\/\//i.test(value)) return value;
  if (/^https:\/\//i.test(value) && /\/api\/auth\/google\/mobile\/done\/?$/i.test(value.split('?')[0])) {
    return value.split('?')[0];
  }
  throw new Error('Invalid app redirect URI');
}

function doneUrlFromCallback(callbackUrl?: string) {
  if (callbackUrl) return callbackUrl.replace(/\/callback\/?$/, '/done');
  if (config.google.mobileCallbackUrl) {
    return config.google.mobileCallbackUrl.replace(/\/callback\/?$/, '/done');
  }
  return 'vamvamvam://auth';
}

export async function createMobileGoogleAuthUrl(input: {
  appRedirect: string;
  callbackUrl: string;
  clientSession?: string;
  referralCode?: string;
}) {
  assertGoogleConfigured();
  const safeRedirect = sanitizeAppRedirect(input.appRedirect, input.callbackUrl);
  const state = crypto.randomBytes(24).toString('hex');
  const clientSession = String(input.clientSession || '').trim() || crypto.randomBytes(16).toString('hex');

  await putDoc({
    kind: 'state',
    key: `state:${state}`,
    appRedirect: safeRedirect,
    clientSession,
    referralCode: String(input.referralCode || '').trim() || undefined,
  });

  const params = new URLSearchParams({
    client_id: config.google.clientId,
    redirect_uri: input.callbackUrl,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
    access_type: 'online',
  });

  return {
    url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    clientSession,
  };
}

export async function completeMobileGoogleCallback(input: {
  code?: string;
  state?: string;
  callbackUrl: string;
  error?: string;
}) {
  if (input.error) throw new Error(`Google authorization failed: ${input.error}`);
  if (!input.code || !input.state) throw new Error('Missing Google authorization code');

  const pending = await takeDoc(`state:${input.state}`);
  if (!pending) throw new Error('Google sign-in expired. Try again.');

  assertGoogleConfigured();

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: input.code,
      client_id: config.google.clientId,
      client_secret: config.google.clientSecret,
      redirect_uri: input.callbackUrl,
      grant_type: 'authorization_code',
    }),
  });
  const tokenJson: any = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok || !tokenJson.access_token) {
    logger.error(`Google token exchange failed: ${tokenJson.error || tokenRes.status}`);
    throw new Error(tokenJson.error_description || 'Google token exchange failed');
  }

  const profileRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  const profile: any = await profileRes.json().catch(() => ({}));
  if (!profileRes.ok || !profile.email) throw new Error('Could not load Google profile');

  const session = await loginService.authenticateGoogleUser({
    email: String(profile.email),
    name: String(profile.name || profile.given_name || 'Vamvamvam User'),
    avatarUrl: String(profile.picture || ''),
    referralCode: pending.referralCode ? String(pending.referralCode) : undefined,
  });

  const ticket = crypto.randomBytes(24).toString('hex');
  await putDoc({
    kind: 'ticket',
    key: `ticket:${ticket}`,
    ticket,
    clientSession: pending.clientSession,
    user: session.user,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  });

  if (pending.clientSession) {
    await putDoc({
      kind: 'session',
      key: `session:${pending.clientSession}`,
      ticket,
      clientSession: pending.clientSession,
      appRedirect: pending.appRedirect,
      user: session.user,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    });
  }

  return {
    ticket,
    clientSession: String(pending.clientSession || ''),
    appRedirect: String(pending.appRedirect || doneUrlFromCallback(input.callbackUrl)),
  };
}

export async function exchangeMobileTicket(ticket: string) {
  const key = String(ticket || '').trim();
  const pending = await takeDoc(`ticket:${key}`);
  if (!pending?.accessToken) throw new Error('Sign-in ticket expired. Try again.');
  if (pending.clientSession) {
    await MobileAuthModel.deleteOne({ key: `session:${pending.clientSession}` }).catch(() => {});
  }
  return {
    user: pending.user,
    accessToken: pending.accessToken,
    refreshToken: pending.refreshToken,
  };
}

export async function pollMobileSession(clientSession: string) {
  const key = `session:${String(clientSession || '').trim()}`;
  const pending = await getDoc(key);
  if (!pending?.ticket) return null;
  return { ticket: String(pending.ticket) };
}

export function resolveMobileCallbackUrl(reqHost?: string, reqProtocol?: string) {
  if (config.google.mobileCallbackUrl) return config.google.mobileCallbackUrl;
  const host = String(reqHost || '').split(',')[0].trim();
  if (!host) throw new Error('Set GOOGLE_MOBILE_CALLBACK_URL for mobile Google sign-in');
  const protocol =
    reqProtocol === 'https' || host.includes('vamvamvamai.com') || host.includes('trycloudflare.com')
      ? 'https'
      : 'http';
  return `${protocol}://${host}/api/auth/google/mobile/callback`;
}

export function mobileAuthDoneHtml(appUrl: string, _ticket: string) {
  // Blank bounce page — auto-opens the app. No user-facing “signed in” copy.
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="refresh" content="0;url=${appUrl.replace(/"/g, '&quot;')}" />
  <title></title>
  <style>html,body{margin:0;background:#000;height:100%;}</style>
</head>
<body>
  <script>
    (function () {
      var target = ${JSON.stringify(appUrl)};
      try { window.location.replace(target); } catch (e) {}
      setTimeout(function () { window.location.href = target; }, 50);
      setTimeout(function () { window.location.href = target; }, 400);
    })();
  </script>
</body>
</html>`;
}
