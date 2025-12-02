import { Request, Response, NextFunction } from 'express';

type RateLimitKey = string;

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message: Record<string, unknown>;
}

interface Counter {
  count: number;
  startedAt: number;
}

const createMemoryLimiter = (options: RateLimitOptions) => {
  const counters = new Map<RateLimitKey, Counter>();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = req.ip || 'unknown';
    const current = counters.get(key);

    if (current && now - current.startedAt < options.windowMs) {
      if (current.count >= options.max) {
        return res.status(429).json(options.message);
      }

      current.count += 1;
      counters.set(key, current);
    } else {
      counters.set(key, { count: 1, startedAt: now });
    }

    next();
  };
};

export const publicApiLimiter = createMemoryLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: 'TOO_MANY_REQUESTS',
    message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
  },
});

export const authApiLimiter = createMemoryLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: 'TOO_MANY_ATTEMPTS',
    message: '로그인 시도가 너무 많습니다.',
  },
});
