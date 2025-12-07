import 'express-serve-static-core';

export interface AuthenticatedUser {
  id: number;
  provider: 'kakao' | 'naver' | 'google' | 'teams' | 'local';
  nickname: string;
  email?: string;
  role: 'guest' | 'user' | 'admin';
  score?: number;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthenticatedUser;
  }
}
