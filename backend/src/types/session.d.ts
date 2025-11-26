import 'express-session';

declare module 'express-session' {
  interface SessionData {
    user?: {
      id: number;
      kakaoId: string;
      nickname: string;
      email?: string;
      profileImage?: string;
    };
  }
}
