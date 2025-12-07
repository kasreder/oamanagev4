import 'express-serve-static-core';

export interface AuthenticatedUser {
  id: number;
  loginMethod?: string;
  kakaoId?: string;
  nickname?: string;
  email?: string;
  profileImage?: string;
  score?: number;
  role?: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthenticatedUser;
  }
}
