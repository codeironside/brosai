import { UserModel } from '../../auth/models/userModel.js';
import { encryptSecret } from '../../../core/crypto/tokenVault.js';
import { ConnectedProfile, PLATFORM_META, SocialPlatform, SUPPORTED_PLATFORMS, isPlatformOfferedToUsers } from './platformOAuth.js';

export interface PublicSocialAccount {
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

export async function upsertConnectedAccount(
  userId: string,
  platform: SocialPlatform,
  profile: ConnectedProfile
): Promise<PublicSocialAccount[]> {
  const dbUser = await UserModel.findById(userId);
  if (!dbUser) {
    throw new Error('User not found');
  }

  const meta = PLATFORM_META[platform];
  const record = {
    platform,
    name: meta.name,
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
    capabilities: meta.capabilities
  };

  const accounts = dbUser.socialAccounts || [];
  const index = accounts.findIndex((acc: any) => acc.platform === platform);
  if (index >= 0) {
    accounts[index] = record;
  } else {
    accounts.push(record);
  }

  dbUser.socialAccounts = accounts;
  dbUser.markModified('socialAccounts');
  await dbUser.save();

  return listPublicAccounts(accounts);
}

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
  return SUPPORTED_PLATFORMS.filter(isPlatformOfferedToUsers).map((platform) => {
    const meta = PLATFORM_META[platform];
    const found = saved.find((acc: any) => acc.platform === platform);
    if (!found) {
      return {
        platform,
        name: meta.name,
        connected: false,
        capabilities: meta.capabilities,
        notes: meta.notes,
        tokenStatus: 'missing'
      };
    }

    const expiresAt = found.tokenExpiresAt ? new Date(found.tokenExpiresAt) : undefined;
    const expired = expiresAt ? expiresAt.getTime() < Date.now() && !found.refreshTokenEnc : false;

    return {
      platform,
      name: meta.name,
      connected: Boolean(found.connected) && Boolean(found.accessTokenEnc) && !expired,
      handle: found.handle,
      avatarUrl: found.avatarUrl,
      lastSync: found.lastSync,
      accountId: found.accountId,
      capabilities: found.capabilities || meta.capabilities,
      notes: meta.notes,
      tokenStatus: !found.accessTokenEnc ? 'missing' : expired ? 'expired' : 'active'
    };
  });
}
