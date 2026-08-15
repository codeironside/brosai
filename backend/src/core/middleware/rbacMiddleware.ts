import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger/index.js';
import { tokenService } from '../../api/auth/services/tokenService.js';

export type UserRole = 'admin' | 'user';

export interface AuthenticatedUserPayload {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUserPayload;
    }
  }
}

/**
 * Express middleware to authenticate Bearer Access Token
 */
export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    logger.warn(`[Auth Middleware] Missing Bearer token for ${req.originalUrl}`);
    res.status(401).json({ success: false, error: 'Unauthorized: Access Token missing' });
    return;
  }

  const payload = tokenService.verifyAccessToken(token);
  if (!payload) {
    logger.warn(`[Auth Middleware] Invalid/expired Access Token for ${req.originalUrl}`);
    res.status(401).json({ success: false, error: 'Unauthorized: Access Token expired or invalid' });
    return;
  }

  req.user = {
    id: payload.userId,
    email: payload.email,
    role: payload.role
  };

  next();
};

/**
 * Express middleware to restrict route access by user role (RBAC)
 */
export const requireRole = (...allowedRoles: UserRole[]) => {

  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      logger.warn(`[RBAC] Access denied: Unauthenticated request to ${req.originalUrl}`);
      res.status(401).json({
        success: false,
        error: 'Unauthorized: Authentication required',
      });
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      logger.warn(`[RBAC] Forbidden: User ${user.email} (Role: ${user.role}) attempted to access ${req.originalUrl} requiring roles: [${allowedRoles.join(', ')}]`);
      res.status(403).json({
        success: false,
        error: `Forbidden: Insufficient privileges. Required role: [${allowedRoles.join(', ')}]`,
      });
      return;
    }

    next();
  };
};
