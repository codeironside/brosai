import { logger } from '../../../core/logger/index.js';
import { config } from '../../../core/config/index.js';
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

    try {
      // Upsert user profile into MongoDB database
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

      // Generate Access Token (short-lived) & Refresh Token (long-lived)
      const tokens = tokenService.generateTokens({
        userId: dbUser._id.toString(),
        email: dbUser.email,
        role: dbUser.role
      });

      // Save Refresh Token in DB
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
          role: dbUser.role, // strictly 'user' or 'admin'
          autopilotMode: dbUser.autopilotMode || 'assisted',
          authProvider: 'google'
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      };
    } catch (err: any) {
      logger.error(`[Auth Service] Database upsert warning: ${err.message}. Falling back to memory tokens.`);
      
      const fallbackId = 'usr_google_' + Math.random().toString(36).substring(2, 9);
      const tokens = tokenService.generateTokens({
        userId: fallbackId,
        email: dto.email,
        role: assignedRole
      });

      return {
        user: {
          id: fallbackId,
          name: dto.name || 'Vamvamvam User',
          email: dto.email,
          avatarUrl: dto.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
          category: 'business',
          organizationName: 'Vamvamvam Brand Account',
          role: assignedRole,
          autopilotMode: 'assisted',
          authProvider: 'google'
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      };
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


