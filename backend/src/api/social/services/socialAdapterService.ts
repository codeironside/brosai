import { config } from '../../../core/config/index.js';
import { logger } from '../../../core/logger/index.js';
import { OAuthSessionModel } from '../models/oauthSessionModel.js';
import { generateOAuthState, generatePkce } from './oauthPkce.js';
import {
  PLATFORM_META,
  SocialPlatform,
  SUPPORTED_PLATFORMS,
  assertPlatformConfigured,
  buildAuthorizationUrl,
  completeOAuth,
  isPlatformOfferedToUsers,
  normalizePlatform,
  redirectUriFor
} from './platformOAuth.js';
import {
  PublicSocialAccount,
  disconnectAccount,
  listPublicAccounts,
  upsertConnectedAccount
} from './socialAccountStore.js';
import { UserModel } from '../../auth/models/userModel.js';

const SESSION_TTL_MS = 10 * 60 * 1000;

export class SocialAdapterService {
  async getCapabilities(): Promise<PublicSocialAccount[]> {
    return SUPPORTED_PLATFORMS.filter(isPlatformOfferedToUsers).map((platform) => ({
      platform,
      name: PLATFORM_META[platform].name,
      connected: false,
      capabilities: PLATFORM_META[platform].capabilities,
      notes: PLATFORM_META[platform].notes,
      tokenStatus: 'missing' as const
    }));
  }

  async listAccounts(userId: string): Promise<PublicSocialAccount[]> {
    const dbUser = await UserModel.findById(userId);
    return listPublicAccounts(dbUser?.socialAccounts || []);
  }

  async startOAuth(userId: string, rawPlatform: string): Promise<{ success: boolean; platform: SocialPlatform; oauthUrl: string }> {
    const platform = normalizePlatform(rawPlatform);
    if (!isPlatformOfferedToUsers(platform)) {
      throw new Error(`${PLATFORM_META[platform].name} is not available yet.`);
    }
    assertPlatformConfigured(platform);

    const { codeVerifier, codeChallenge } = generatePkce();
    const state = generateOAuthState();
    const redirectUri = redirectUriFor(platform);

    await OAuthSessionModel.deleteMany({ userId, platform });
    await OAuthSessionModel.create({
      state,
      userId,
      platform,
      codeVerifier,
      redirectUri,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS)
    });

    const oauthUrl = buildAuthorizationUrl({ platform, redirectUri, state, codeChallenge });
    logger.info(`[Social Service] Started OAuth for ${platform}`, { userId, redirectUri, oauthUrl });
    return { success: true, platform, oauthUrl, redirectUri };
  }

  async handleCallback(query: {
    code?: string;
    state?: string;
    error?: string;
    error_description?: string;
  }): Promise<{ platform: SocialPlatform; handle: string }> {
    if (query.error) {
      throw new Error(query.error_description || query.error);
    }
    if (!query.code || !query.state) {
      throw new Error('OAuth callback is missing code or state');
    }

    const session = await OAuthSessionModel.findOne({ state: query.state });
    if (!session) {
      throw new Error('OAuth session expired or is invalid. Please try connecting again.');
    }

    const platform = normalizePlatform(session.platform);
    try {
      const profile = await completeOAuth({
        platform,
        code: query.code,
        redirectUri: session.redirectUri,
        codeVerifier: session.codeVerifier
      });

      await upsertConnectedAccount(String(session.userId), platform, profile);
      await OAuthSessionModel.deleteOne({ _id: session._id });

      logger.info(`[Social Service] Connected ${platform} as ${profile.handle}`);
      return { platform, handle: profile.handle };
    } catch (error) {
      await OAuthSessionModel.deleteOne({ _id: session._id });
      throw error;
    }
  }

  async disconnect(userId: string, rawPlatform: string): Promise<PublicSocialAccount[]> {
    const platform = normalizePlatform(rawPlatform);
    logger.info(`[Social Service] Disconnecting ${platform} for user ${userId}`);
    return disconnectAccount(userId, platform);
  }

  getFrontendOrigin(): string {
    return config.app.frontendUrl.replace(/\/$/, '');
  }
}

export const socialAdapterService = new SocialAdapterService();
