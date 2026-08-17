import { logger } from '../../../core/logger/index.js';
import { config } from '../../../core/config/index.js';
import { ensureDatabase } from '../../../core/db/index.js';
import { UserModel } from '../models/userModel.js';
import { tokenService } from './tokenService.js';

export interface GoogleLoginDTO {
  email: string;
  name?: string;
  avatarUrl?: string;
}

// Explicit system administrator emails override (all other signups default strictly to config.app.defaultUserRole = 'user')
const EXPLICIT_ADMIN_EMAILS = [
  'admin@vamvamvam.ai'
];

export class LoginService {
  async authenticateGoogleUser(dto: GoogleLoginDTO) {
    logger.info(`[Auth Service] Authenticating Google user: ${dto.email}`);
    
    // New signups strictly default to 'user' unless explicitly matched in system admin list
    const assignedRole: 'admin' | 'user' = EXPLICIT_ADMIN_EMAILS.includes(dto.email.toLowerCase()) 
      ? 'admin' 
      : config.app.defaultUserRole;

    const isTransientDbError = (err: unknown) =>
      /closing|closed|topology|not connected|ECONNREFUSED|buffering timed out|interrupted/i.test(
        String((err as { message?: string })?.message || '')
      );

    const persistUser = async () => {
      await ensureDatabase();
      const dbUser = await UserModel.findOneAndUpdate(
        { email: dto.email.toLowerCase() },
        {
          $set: {
            name: dto.name || 'Vamvamvam User',
            email: dto.email.toLowerCase(),
            authProvider: 'google',
          },
          $setOnInsert: {
            avatarUrl: dto.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
            role: assignedRole,
            category: 'business',
            organizationName: 'Vamvamvam Brand Account',
            autopilotMode: 'assisted',
            createdAt: new Date()
          }
        },
        { upsert: true, new: true }
      );

      const tokens = tokenService.generateTokens({
        userId: dbUser._id.toString(),
        email: dbUser.email,
        role: dbUser.role
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
          role: dbUser.role,
          autopilotMode: dbUser.autopilotMode || 'assisted',
          authProvider: 'google'
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
   * Renew Access Token using Refresh Token
   */
  async refreshAccessToken(refreshToken: string) {
    const payload = tokenService.verifyRefreshToken(refreshToken);
    if (!payload) {
      throw new Error('Invalid or expired Refresh Token');
    }

    // Generate new Access and Refresh tokens
    const newTokens = tokenService.generateTokens({
      userId: payload.userId,
      email: payload.email,
      role: payload.role
    });

    return newTokens;
  }
}

export const loginService = new LoginService();


