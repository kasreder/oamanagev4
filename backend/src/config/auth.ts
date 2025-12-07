import './env';

export const authConfig = {
  jwtSecret: process.env.JWT_SECRET || 'change-this-secret',
  accessTokenTtlSeconds: Number(process.env.ACCESS_TOKEN_TTL || 60 * 15),
  refreshTokenTtlSeconds: Number(process.env.REFRESH_TOKEN_TTL || 60 * 60 * 24 * 7),
};

export const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'session-secret',
};
