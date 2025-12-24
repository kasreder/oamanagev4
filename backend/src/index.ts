import app from './app';
import db from './config/database';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await db.testConnection();

    app.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════════╗
║                                              ║
║   🚀 Server is running on port ${PORT}           ║
║                                              ║
║   📝 API Endpoints:                          ║
║   - GET  /api/v1/health                      ║
║   - POST /api/v1/auth/social/:provider       ║
║   - POST /api/v1/auth/refresh                ║
║   - GET  /api/v1/assets                      ║
║   - GET  /api/v1/assets/:uid                 ║
║   - GET  /api/v1/users/me                    ║
║                                              ║
╚══════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
