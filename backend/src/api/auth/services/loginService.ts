import { logger } from '../../../core/logger/index.js';
import { config } from '../../../core/config/index.js';
import { ensureDatabase } from '../../../core/db/index.js';
import { UserModel } from '../models/userModel.js';
import { tokenService } from './tokenService.js';
import { ensureReferralCode, resolveReferredBy } from '../../billing/services/referralService.js';
import { isExplicitAdminEmail, resolveRoleForEmail } from './adminEmails.js';

export interface GoogleLoginDTO {
  email: string;
  name?: string;
  avatarUrl?: string;
  referralCode?: string;
}

export class LoginService {
  async authenticateGoogleUser(dto: GoogleLoginDTO) {
    logger.info(`[Auth Service] Authenticating Google user: ${dto.email}`);
    
    const assignedRole: 'admin' | 'user' = resolveRoleForEmail(
      dto.email,
      config.app.defaultUserRole,
    );

    const isTransientDbError = (err: unknown) =>
      /closing|closed|topology|not connected|ECONNREFUSED|buffering timed out|interrupted/i.test(
        String((err as { message?: string })?.message || '')
      );

    const persistUser = async () => {
      await ensureDatabase();
      const referredBy = await resolveReferredBy(dto.referralCode);
      const existing = await UserModel.findOne({ email: dto.email.toLowerCase() });

      const setOnInsert: Record<string, unknown> = {
        avatarUrl: dto.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
        category: 'business',
        organizationName: 'Vamvamvam Brand Account',
        autopilotMode: 'assisted',
        subscriptionTierSlug: 'free',
        subscriptionStatus: 'free',
        createdAt: new Date(),
      };
      if (!existing && referredBy) {
        setOnInsert.referredBy = referredBy;
      }

      const $set: Record<string, unknown> = {
        name: dto.name || 'Vamvamvam User',
        email: dto.email.toLowerCase(),
        authProvider: 'google',
      };
      // MongoDB forbids the same path in $set and $setOnInsert — put role in only one.
      if (assignedRole === 'admin') {
        $set.role = 'admin';
      } else {
        setOnInsert.role = assignedRole;
      }

      const dbUser = await UserModel.findOneAndUpdate(
        { email: dto.email.toLowerCase() },
        {
          $set,
          $setOnInsert: setOnInsert,
        },
        { upsert: true, new: true }
      );

      // Ensure role on the in-memory doc matches what we persist (JWT must carry admin)
      if (assignedRole === 'admin' && dbUser.role !== 'admin') {
        dbUser.role = 'admin';
      }

      await ensureReferralCode(dbUser);

      const tokens = tokenService.generateTokens({
        userId: dbUser._id.toString(),
        email: dbUser.email,
        role: assignedRole === 'admin' ? 'admin' : (dbUser.role === 'admin' ? 'admin' : 'user'),
      });

      dbUser.refreshToken = tokens.refreshToken;
      await dbUser.save();

      logger.info(`[Auth Service] Saved user to MongoDB. ID: ${dbUser._id}, Role: ${dbUser.role}. Tokens generated.`);

      return {
        user: {
          id: dbUser._id.toString(),
          name: dbUser.name,
          email: dbUser.email,
          avatarUrl: dbUser.avatarUrl,
          category: dbUser.category,
          organizationName: dbUser.organizationName,
          role: assignedRole === 'admin' ? 'admin' : dbUser.role,
          autopilotMode: dbUser.autopilotMode || 'assisted',
          authProvider: 'google',
          referralCode: dbUser.referralCode || null,
          subscriptionTierSlug: dbUser.subscriptionTierSlug || 'free',
          subscriptionStatus: dbUser.subscriptionStatus || 'free',
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      };
    };

    try {
      return await persistUser();
    } catch (err: any) {
      if (isTransientDbError(err)) {
        logger.warn(`[Auth Service] Database was still starting (${err.message}). Retrying once.`);
        return await persistUser();
      }
      logger.error(`[Auth Service] Database upsert failed: ${err.message}`);
      throw err;
    }
  }

  /**
   * Renew Access Token using Refresh Token — always reload role from DB
   * so explicit admins are not stuck with a stale JWT role.
   */
  async refreshAccessToken(refreshToken: string) {
    const payload = tokenService.verifyRefreshToken(refreshToken);
    if (!payload) {
      throw new Error('Invalid or expired Refresh Token');
    }

    await ensureDatabase();
    const dbUser = await UserModel.findById(payload.userId);
    let role: 'admin' | 'user' = payload.role === 'admin' ? 'admin' : 'user';
    if (dbUser) {
      if (isExplicitAdminEmail(dbUser.email) && dbUser.role !== 'admin') {
        dbUser.role = 'admin';
        await dbUser.save();
      }
      role = resolveRoleForEmail(dbUser.email, dbUser.role === 'admin' ? 'admin' : 'user');
    } else {
      role = resolveRoleForEmail(payload.email, role);
    }

    const newTokens = tokenService.generateTokens({
      userId: payload.userId,
      email: payload.email,
      role,
    });

    return newTokens;
  }
}

export const loginService = new LoginService();


