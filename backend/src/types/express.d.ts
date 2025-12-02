import 'express-serve-static-core';

export interface AuthenticatedUser {
  id: number;
  kakaoId?: string;
  nickname?: string;
  email?: string;
  profileImage?: string;
  role?: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthenticatedUser;
  }
}
