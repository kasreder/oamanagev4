import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import session from 'express-session';
import authRoutes from './routes/auth.routes';
import './config/env';

const app: Express = express();

// CORS 설정
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);

// Body parser 미들웨어
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 세션 설정
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // HTTPS에서만 true
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7일
    },
  })
);

// 라우트 설정
app.use('/auth', authRoutes);

// 기본 라우트: 사용 가능한 엔드포인트 안내
app.get('/', (req: Request, res: Response) => {
  const port = process.env.PORT || 3000;
  const baseUrl = process.env.API_BASE_URL || `http://localhost:${port}`;

  res.json({
    success: true,
    message: '카카오 로그인 백엔드가 실행 중입니다.',
    endpoints: {
      health: `${baseUrl}/health`,
      kakaoLogin: `${baseUrl}/auth/kakao`,
      kakaoCallback: `${baseUrl}/auth/kakao/callback`,
      currentUser: `${baseUrl}/auth/me`,
      logout: `${baseUrl}/auth/logout`,
    },
  });
});

// 헬스 체크
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// 404 핸들러
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// 에러 핸들러
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

export default app;
