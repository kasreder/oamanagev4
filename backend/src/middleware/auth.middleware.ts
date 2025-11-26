import { Request, Response, NextFunction } from 'express';

/**
 * 로그인 여부 확인 미들웨어
 */
export const isAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.session.user) {
    return next();
  }

  res.status(401).json({
    success: false,
    message: 'Authentication required',
  });
};

/**
 * 로그인되지 않은 상태 확인 미들웨어
 */
export const isNotAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.session.user) {
    return next();
  }

  res.status(400).json({
    success: false,
    message: 'Already authenticated',
  });
};
