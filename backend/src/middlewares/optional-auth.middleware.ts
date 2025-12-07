import { Request, Response, NextFunction } from 'express';
import { jwtConfig } from '../config/auth';
import { verifyToken } from '../utils/jwt';
import { AuthenticatedUser } from '../types/express';

const extractBearerToken = (authorization?: string): string | undefined => {
  if (!authorization) return undefined;
  const [scheme, value] = authorization.split(' ');
  if (scheme !== 'Bearer' || !value) return undefined;
  return value.trim();
};

const buildUserFromSession = (req: Request): AuthenticatedUser | undefined => {
  if (!req.session.user) return undefined;
  return {
    ...req.session.user,
    role: req.session.user.role || 'user',
  };
};

const buildUserFromToken = (token: string): AuthenticatedUser | undefined => {
  const payload = verifyToken(token, jwtConfig.secret);
  if (!payload || typeof payload !== 'object') return undefined;

  const id = payload.id;
  if (typeof id !== 'number') return undefined;

  return {
    id,
    loginMethod:
      typeof payload.loginMethod === 'string'
        ? payload.loginMethod
        : typeof payload.login_method === 'string'
          ? payload.login_method
          : undefined,
    kakaoId: typeof payload.kakaoId === 'string' ? payload.kakaoId : undefined,
    nickname: typeof payload.nickname === 'string' ? payload.nickname : undefined,
    email: typeof payload.email === 'string' ? payload.email : undefined,
    profileImage:
      typeof payload.profileImage === 'string' ? payload.profileImage : undefined,
    score: typeof payload.score === 'number' ? payload.score : undefined,
    role: typeof payload.role === 'string' ? payload.role : 'user',
  };
};

const resolveUser = (req: Request): AuthenticatedUser | undefined => {
  const token = extractBearerToken(req.headers.authorization);
  if (token) {
    const user = buildUserFromToken(token);
    if (user) return user;
  }
  return buildUserFromSession(req);
};

export const optionalAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  req.user = resolveUser(req);
  next();
};

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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

export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
