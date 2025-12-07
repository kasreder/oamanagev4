import 'express-session';

declare module 'express-session' {
  interface SessionData {
    user?: {
      id: number;
      loginMethod: string;
      kakaoId: string;
      nickname: string;
      email?: string;
      profileImage?: string;
      score: number;
      role?: string;
    };
  }
}
