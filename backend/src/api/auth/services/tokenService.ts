import jwt from 'jsonwebtoken';
import { config } from '../../../core/config/index.js';
import { logger } from '../../../core/logger/index.js';

export interface TokenPayload {
  userId: string;
  email: string;
  role: 'admin' | 'user';
}

export class TokenService {
  /**
   * Generates a pair of JWT Access Token (short-lived) and Refresh Token (long-lived)
   */
  generateTokens(payload: TokenPayload) {
    const accessToken = jwt.sign(
      payload,
      config.app.jwtSecret,
      { expiresIn: config.app.jwtAccessExpiration as any }
    );

    const refreshToken = jwt.sign(
      payload,
      config.app.jwtRefreshSecret,
      { expiresIn: config.app.jwtRefreshExpiration as any }
    );

    return { accessToken, refreshToken };
  }

  /**
   * Verifies an Access Token
   */
  verifyAccessToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, config.app.jwtSecret) as TokenPayload;
    } catch (err: any) {
      logger.warn(`[TokenService] Access Token verification failed: ${err.message}`);
      return null;
    }
  }

  /**
   * Verifies a Refresh Token
   */
  verifyRefreshToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, config.app.jwtRefreshSecret) as TokenPayload;
    } catch (err: any) {
      logger.warn(`[TokenService] Refresh Token verification failed: ${err.message}`);
      return null;
    }
  }
}

export const tokenService = new TokenService();
