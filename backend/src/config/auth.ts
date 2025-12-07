import type { SessionOptions } from 'express-session';

import './env';

export const authConfig = {
  jwtSecret: process.env.JWT_SECRET || 'change-this-secret',
  accessTokenTtlSeconds: Number(process.env.ACCESS_TOKEN_TTL || 60 * 15),
  refreshTokenTtlSeconds: Number(process.env.REFRESH_TOKEN_TTL || 60 * 60 * 24 * 7),
};

export const sessionConfig: SessionOptions = {
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
};

