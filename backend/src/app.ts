import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import session from 'express-session';
import routes from './routes';
import './config/env';
import { sessionConfig } from './config/auth';

const app: Express = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*';

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session(sessionConfig));

app.use(['/auth/kakao', '/auth/kakao/callback'], (req, res) => {
  const target = `/api/v1${req.originalUrl}`;
  res.redirect(308, target);
});

app.use('/api/v1', routes);

app.get('/', (_req: Request, res: Response) => {
  const port = process.env.PORT || 3000;
  const baseUrl = process.env.API_BASE_URL || `http://127.0.0.1:${port}`;
  const apiBase = `${baseUrl}/api/v1`;

  res.json({
    success: true,
    message: 'OA Asset Manager 백엔드가 실행 중입니다.',
    endpoints: {
      health: `${apiBase}/health`,
      kakaoLogin: `${apiBase}/auth/kakao`,
      kakaoCallback: `${apiBase}/auth/kakao/callback`,
      socialLogin: `${apiBase}/auth/social/:provider`,
      refresh: `${apiBase}/auth/refresh`,
      currentUser: `${apiBase}/auth/me`,
      logout: `${apiBase}/auth/logout`,
      assets: `${apiBase}/assets`,
      assetDetail: `${apiBase}/assets/:uid`,
      assetReference: `${apiBase}/references/assets`,
      currentUserByToken: `${apiBase}/users/me`,
    },
  });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, message: '요청한 경로를 찾을 수 없습니다.' });
});

app.use((err: Error, _req: Request, res: Response, _next: any) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: '내부 서버 오류가 발생했습니다.',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

export default app;
