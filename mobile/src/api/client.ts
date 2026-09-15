import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../config';

const ACCESS_KEY = 'brosai_access_token';
const REFRESH_KEY = 'brosai_refresh_token';
const USER_KEY = 'brosai_user_data';

export type ApiUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role?: string;
  category?: string;
  organizationName?: string;
  autopilotMode?: string;
  authProvider?: string;
};

type Tokens = { accessToken: string; refreshToken: string };

let memoryAccess = '';
let memoryRefresh = '';
let memoryUser: ApiUser | null = null;
let refreshInFlight: Promise<boolean> | null = null;
let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

export async function loadStoredSession(): Promise<{ user: ApiUser | null; accessToken: string }> {
  const [accessToken, refreshToken, rawUser] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_KEY),
    SecureStore.getItemAsync(REFRESH_KEY),
    SecureStore.getItemAsync(USER_KEY),
  ]);
  memoryAccess = accessToken || '';
  memoryRefresh = refreshToken || '';
  memoryUser = rawUser ? (JSON.parse(rawUser) as ApiUser) : null;
  return { user: memoryUser, accessToken: memoryAccess };
}

export async function saveSession(user: ApiUser, tokens: Tokens) {
  memoryUser = user;
  memoryAccess = tokens.accessToken;
  memoryRefresh = tokens.refreshToken;
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_KEY, tokens.accessToken),
    SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken),
    SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)),
  ]);
}

export async function clearSession() {
  memoryUser = null;
  memoryAccess = '';
  memoryRefresh = '';
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
    SecureStore.deleteItemAsync(USER_KEY),
  ]);
}

export function getAccessToken() {
  return memoryAccess;
}

export function getStoredUser() {
  return memoryUser;
}

async function refreshTokens(): Promise<boolean> {
  if (!memoryRefresh) return false;
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: memoryRefresh }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success || !json?.data?.accessToken) return false;
      memoryAccess = String(json.data.accessToken);
      memoryRefresh = String(json.data.refreshToken || memoryRefresh);
      await Promise.all([
        SecureStore.setItemAsync(ACCESS_KEY, memoryAccess),
        SecureStore.setItemAsync(REFRESH_KEY, memoryRefresh),
      ]);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T = any>(
  path: string,
  init: RequestInit = {},
  opts: { auth?: boolean } = { auth: true },
): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  const headers = new Headers(init.headers || {});
  if (!headers.has('Content-Type') && init.body) headers.set('Content-Type', 'application/json');
  if (opts.auth !== false && memoryAccess) headers.set('Authorization', `Bearer ${memoryAccess}`);

  let res = await fetch(url, { ...init, headers });

  if (res.status === 401 && opts.auth !== false) {
    const ok = await refreshTokens();
    if (ok) {
      headers.set('Authorization', `Bearer ${memoryAccess}`);
      res = await fetch(url, { ...init, headers });
    } else {
      await clearSession();
      onUnauthorized?.();
      throw new ApiError('Session expired. Sign in again.', 401);
    }
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    throw new ApiError(json?.error || json?.message || `Request failed (${res.status})`, res.status);
  }
  return json as T;
}
