import app from './app';
import db from './config/database';

const PORT = process.env.PORT || 3000;

// DB 연결 테스트 후 서버 시작
const startServer = async () => {
  try {
    await db.testConnection();

    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════╗
║                                                    ║
║   🚀 Server is running on port ${PORT}             ║
║                                                    ║
║   📝 API Endpoints:                                ║
║   - GET  /api/v1/health                            ║
║   - GET  /api/v1/auth/kakao                        ║
║   - GET  /api/v1/auth/kakao/callback               ║
║   - GET  /api/v1/auth/me                           ║
║   - POST /api/v1/auth/logout                       ║
║   - GET  /api/v1/assets                            ║
║   - GET  /api/v1/assets/:uid                       ║
║                                                    ║
║   🔐 Kakao Login:                                  ║
║   http://localhost:${PORT}/api/v1/auth/kakao       ║
║                                                    ║
║   💾 Database: Connected                           ║
║                                                    ║
╚════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
