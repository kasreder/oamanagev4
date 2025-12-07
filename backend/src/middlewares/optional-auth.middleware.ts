import { NextFunction, Request, Response } from 'express';
import { authConfig } from '../config/auth';
import { verifyToken } from '../utils/jwt';
import { AuthenticatedUser } from '../types/express';

const extractBearerToken = (authorization?: string): string | undefined => {
  if (!authorization) return undefined;
  const [scheme, value] = authorization.split(' ');
  if (scheme !== 'Bearer' || !value) return undefined;
  return value.trim();
};

const resolveUser = (req: Request): AuthenticatedUser | undefined => {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) return undefined;

  const payload = verifyToken(token, authConfig.jwtSecret);
  if (!payload || typeof payload !== 'object') return undefined;

  const { id, provider, nickname, email, role, score } = payload;

  if (typeof id !== 'number' || typeof provider !== 'string' || typeof nickname !== 'string') {
    return undefined;
  }

  return {
    id,
    provider: provider as AuthenticatedUser['provider'],
    nickname,
    email: typeof email === 'string' ? email : undefined,
    role: (role as AuthenticatedUser['role']) || 'user',
    score: typeof score === 'number' ? score : undefined,
  };
};

export const optionalAuth = (req: Request, _res: Response, next: NextFunction) => {
  req.user = resolveUser(req);
  next();
};

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const user = resolveUser(req);

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: '인증이 필요합니다.',
    });
  }

  req.user = user;
  next();
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = resolveUser(req);

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: '관리자 권한이 필요합니다.',
    });
  }

  if (user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'FORBIDDEN',
      message: '관리자 전용 엔드포인트입니다.',
    });
  }

  req.user = user;
  next();
};
