import crypto from 'crypto';
import { authConfig } from '../config/auth';
import { signToken, verifyToken } from '../utils/jwt';
import { AuthenticatedUser } from '../types/express';
import { UserRecord, UserRepository } from '../repositories/user.repository';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class AuthService {
  constructor(private readonly users = new UserRepository()) {}

  socialLogin(provider: AuthenticatedUser['provider'], email?: string): { user: UserRecord; tokens: TokenPair } {
    const existing = this.users.findByProviderId(provider, email);
    const user: UserRecord =
      existing ||
      this.users.upsert({
        id: crypto.randomInt(1000, 9999),
        provider,
        nickname: email?.split('@')[0] || `${provider}-user`,
        email,
        role: 'user',
        score: 0,
      });

    const tokens = this.issueTokens(user);
    return { user, tokens };
  }

  refresh(refreshToken: string): TokenPair | null {
    const payload = verifyToken(refreshToken, authConfig.jwtSecret);
    if (!payload || typeof payload !== 'object') return null;

    const { id } = payload;
    if (typeof id !== 'number') return null;

    const user = this.users.findById(id);
    if (!user || user.refreshToken !== refreshToken) return null;

    return this.issueTokens(user);
  }

  private issueTokens(user: UserRecord): TokenPair {
    const basePayload: AuthenticatedUser = {
      id: user.id,
      provider: user.provider,
      nickname: user.nickname,
      email: user.email,
      role: user.role,
      score: user.score,
    };

    const accessToken = signToken(
      basePayload as unknown as Record<string, unknown>,
      authConfig.jwtSecret,
      authConfig.accessTokenTtlSeconds
    );
    const refreshToken = signToken({ id: user.id }, authConfig.jwtSecret, authConfig.refreshTokenTtlSeconds);
    this.users.saveRefreshToken(user.id, refreshToken);

    return {
      accessToken,
      refreshToken,
      expiresIn: authConfig.accessTokenTtlSeconds,
    };
  }
}
