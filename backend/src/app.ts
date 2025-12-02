import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import session from 'express-session';
import routes from './routes';
import './config/env';
import { sessionConfig } from './config/auth';

const app: Express = express();

// CORS 설정
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : '*';

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parser 미들웨어
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 세션 설정
app.use(session(sessionConfig));

// API 라우트 설정
app.use('/api/v1', routes);

// 기본 라우트: 사용 가능한 엔드포인트 안내
app.get('/', (req: Request, res: Response) => {
  const port = process.env.PORT || 3000;
  const baseUrl = process.env.API_BASE_URL || `http://localhost:${port}`;
  const apiBase = `${baseUrl}/api/v1`;

  res.json({
    success: true,
    message: 'OA Asset Manager 백엔드가 실행 중입니다.',
    endpoints: {
      health: `${apiBase}/health`,
      kakaoLogin: `${apiBase}/auth/kakao`,
      kakaoCallback: `${apiBase}/auth/kakao/callback`,
      currentUser: `${apiBase}/auth/me`,
      logout: `${apiBase}/auth/logout`,
      assets: `${apiBase}/assets`,
    },
  });
});

// 404 핸들러
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: '요청한 경로를 찾을 수 없습니다.',
  });
});

// 에러 핸들러
app.use((err: Error, _req: Request, res: Response, _next: any) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: '내부 서버 오류가 발생했습니다.',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

export default app;
