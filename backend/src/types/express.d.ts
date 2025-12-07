import 'express-serve-static-core';
import type { Session } from 'express-session';

export interface AuthenticatedUser {
  id: number;
  provider?: 'kakao' | 'naver' | 'google' | 'teams' | 'local';
  loginMethod?: string;
  kakaoId?: string;
  nickname?: string;
  email?: string;
  profileImage?: string;
  role?: 'guest' | 'user' | 'admin' | string;
  score?: number;
}

declare module 'express-session' {
  interface SessionData {
    user?: AuthenticatedUser;
  }
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthenticatedUser;
    session: Session & Partial<SessionData>;
  }
}
