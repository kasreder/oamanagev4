import { SessionOptions } from 'express-session';
import './env';

export const sessionConfig: SessionOptions = {
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS에서만 true
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7일
  },
};

export const jwtConfig = {
  secret: process.env.JWT_SECRET || 'change-this-secret',
  expiresIn: process.env.JWT_EXPIRES_IN || '1h',
};
