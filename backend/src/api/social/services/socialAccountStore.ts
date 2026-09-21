import { UserModel } from '../../auth/models/userModel.js';
import { encryptSecret } from '../../../core/crypto/tokenVault.js';
import { ConnectedProfile, PLATFORM_META, SocialPlatform, SUPPORTED_PLATFORMS, isPlatformOfferedToUsers } from './platformOAuth.js';

export interface PublicSocialAccount {
  id: string;
  platform: string;
  name: string;
  connected: boolean;
  handle?: string;
  avatarUrl?: string;
  lastSync?: string;
  accountId?: string;
  tokenStatus?: 'active' | 'expired' | 'missing';
  capabilities?: Record<string, boolean>;
  notes?: string;
}

function accountKey(platform: string, accountId?: string, handle?: string) {
  const id = String(accountId || '').trim();
  if (id) return `${platform}:${id}`;
  const h = String(handle || '').trim().toLowerCase();
  if (h) return `${platform}:handle:${h}`;
  return `${platform}:unknown`;
}

function toPublic(found: any): PublicSocialAccount {
  const platform = String(found.platform || '');
  const meta = PLATFORM_META[platform as SocialPlatform];
  const expiresAt = found.tokenExpiresAt ? new Date(found.tokenExpiresAt) : undefined;
  const expired = expiresAt ? expiresAt.getTime() < Date.now() && !found.refreshTokenEnc : false;
  const accountId = found.accountId ? String(found.accountId) : undefined;
  return {
    id: accountKey(platform, accountId, found.handle),
    platform,
    name: found.name || meta?.name || platform,
    connected: Boolean(found.connected) && Boolean(found.accessTokenEnc) && !expired,
    handle: found.handle,
    avatarUrl: found.avatarUrl,
    lastSync: found.lastSync,
    accountId,
    capabilities: found.capabilities || meta?.capabilities,
    notes: meta?.notes,
    tokenStatus: !found.accessTokenEnc ? 'missing' : expired ? 'expired' : 'active',
  };
}

export async function upsertConnectedAccount(
  userId: string,
  platform: SocialPlatform,
  profile: ConnectedProfile,
): Promise<PublicSocialAccount[]> {
  const dbUser = await UserModel.findById(userId);
  if (!dbUser) {
    throw new Error('User not found');
  }

  const meta = PLATFORM_META[platform];
  const record = {
    platform,
    name: profile.displayName || meta.name,
    connected: true,
    handle: profile.handle,
    avatarUrl: profile.avatarUrl,
    lastSync: new Date().toISOString(),
    accountId: profile.accountId,
    accessTokenEnc: encryptSecret(profile.accessToken),
    refreshTokenEnc: profile.refreshToken ? encryptSecret(profile.refreshToken) : undefined,
    tokenExpiresAt: profile.expiresIn
      ? new Date(Date.now() + Number(profile.expiresIn) * 1000)
      : undefined,
    tokenType: profile.tokenType,
    scopes: profile.scopes,
    capabilities: meta.capabilities,
  };

  const accounts = [...(dbUser.socialAccounts || [])];
  const key = accountKey(platform, profile.accountId, profile.handle);
  const index = accounts.findIndex((acc: any) => accountKey(acc.platform, acc.accountId, acc.handle) === key);
  if (index >= 0) {
    accounts[index] = { ...accounts[index], ...record };
  } else {
    const { assertWithinLimit } = await import('../../billing/services/limitsService.js');
    await assertWithinLimit(userId, 'socialAccounts');
    accounts.push(record);
  }

  dbUser.socialAccounts = accounts;
  dbUser.markModified('socialAccounts');
  await dbUser.save();

  return listPublicAccounts(accounts);
}

export async function disconnectAccountById(userId: string, accountKeyOrId: string): Promise<PublicSocialAccount[]> {
  const dbUser = await UserModel.findById(userId);
  if (!dbUser) {
    throw new Error('User not found');
  }

  const target = String(accountKeyOrId || '').trim();
  const accounts = (dbUser.socialAccounts || []).filter((acc: any) => {
    const key = accountKey(acc.platform, acc.accountId, acc.handle);
    return key !== target && String(acc.accountId || '') !== target;
  });

  if (accounts.length === (dbUser.socialAccounts || []).length) {
    throw new Error('Account not found');
  }

  dbUser.socialAccounts = accounts;
  dbUser.markModified('socialAccounts');
  await dbUser.save();

  return listPublicAccounts(accounts);
}

/** @deprecated Prefer disconnectAccountById — removes every account on a platform */
export async function disconnectAccount(userId: string, platform: SocialPlatform): Promise<PublicSocialAccount[]> {
  const dbUser = await UserModel.findById(userId);
  if (!dbUser) {
    throw new Error('User not found');
  }

  const accounts = (dbUser.socialAccounts || []).filter((acc: any) => acc.platform !== platform);
  dbUser.socialAccounts = accounts;
  dbUser.markModified('socialAccounts');
  await dbUser.save();

  return listPublicAccounts(accounts);
}

export function listPublicAccounts(saved: any[] = []): PublicSocialAccount[] {
  const connected = (saved || [])
    .filter((acc: any) => isPlatformOfferedToUsers(String(acc.platform || '') as SocialPlatform) || SUPPORTED_PLATFORMS.includes(acc.platform))
    .filter((acc: any) => Boolean(acc.accessTokenEnc) || Boolean(acc.connected))
    .map(toPublic);

  if (connected.length) return connected;

  // Empty state placeholders so UI can still show Connect buttons per network
  return SUPPORTED_PLATFORMS.filter(isPlatformOfferedToUsers).map((platform) => {
    const meta = PLATFORM_META[platform];
    return {
      id: `${platform}:placeholder`,
      platform,
      name: meta.name,
      connected: false,
      capabilities: meta.capabilities,
      notes: meta.notes,
      tokenStatus: 'missing' as const,
    };
  });
}

export function listConnectedAccountsOnly(saved: any[] = []): PublicSocialAccount[] {
  return (saved || [])
    .filter((acc: any) => Boolean(acc.accessTokenEnc))
    .map(toPublic)
    .filter((acc) => acc.connected || acc.tokenStatus === 'expired');
}

export function findAccountByKey(saved: any[] = [], keyOrAccountId: string): any | null {
  const target = String(keyOrAccountId || '').trim();
  if (!target) return null;
  return (
    (saved || []).find((acc: any) => {
      const key = accountKey(acc.platform, acc.accountId, acc.handle);
      return key === target || String(acc.accountId || '') === target;
    }) || null
  );
}

export function resolvePublishTargets(saved: any[] = [], postTo: string[] = []): any[] {
  const accounts = saved || [];
  if (!postTo.length) {
    return accounts.filter((acc: any) => acc.connected && acc.accessTokenEnc);
  }

  const resolved: any[] = [];
  const seen = new Set<string>();

  for (const raw of postTo) {
    const item = String(raw || '').trim();
    if (!item) continue;

    // New style: account key or accountId
    const byId = findAccountByKey(accounts, item);
    if (byId?.accessTokenEnc) {
      const key = accountKey(byId.platform, byId.accountId, byId.handle);
      if (!seen.has(key)) {
        seen.add(key);
        resolved.push(byId);
      }
      continue;
    }

    // Legacy: platform slug → all connected accounts on that platform
    const platform = item.toLowerCase() === 'x' ? 'twitter' : item.toLowerCase();
    for (const acc of accounts) {
      if (acc.platform !== platform || !acc.accessTokenEnc) continue;
      const key = accountKey(acc.platform, acc.accountId, acc.handle);
      if (seen.has(key)) continue;
      seen.add(key);
      resolved.push(acc);
    }
  }

  return resolved;
}

export { accountKey };
